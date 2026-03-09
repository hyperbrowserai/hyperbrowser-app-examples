import "dotenv/config";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "../lib/prisma";
import { webSearch, fetchPage } from "../lib/hyperbrowser";
import { synthesize, synthesizeStream, decomposeGoal, type SubtaskPlan } from "../lib/llm";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisOpts = {
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
  tls: redisUrl.startsWith("rediss://") ? {} : undefined,
  retryStrategy: (times: number) => Math.min(times * 500, 5000),
};

const connection = new IORedis(redisUrl, redisOpts);

// Separate publisher for SSE streaming events
const publisher = new IORedis(redisUrl, {
  ...redisOpts,
  lazyConnect: true,
});
publisher.connect().catch(() => {});

function publishEvent(runId: string, event: string, data: Record<string, unknown>) {
  publisher.publish(`run:${runId}`, JSON.stringify({ event, ...data })).catch(() => {});
}

interface JobData {
  runId?: string;
  taskId: string;
  goal: string;
  model: string;
}

async function updateStep(
  stepId: string,
  status: string,
  data?: { outputJson?: string; error?: string; finishedAt?: Date }
) {
  await prisma.step.update({
    where: { id: stepId },
    data: {
      status,
      finishedAt: data?.finishedAt ?? (status !== "running" ? new Date() : undefined),
      ...data,
    },
  });
}

// Run a single subagent: search → fetch → synthesize on its specific subtask
async function runSubagent(
  subagentId: string,
  runId: string,
  plan: SubtaskPlan
): Promise<string> {
  console.log(`[worker] Subagent [${plan.model}] starting: "${plan.task}"`);
  publishEvent(runId, "subagent", { subagentId, model: plan.model, task: plan.task, status: "running" });

  try {
    // Search
    const searchResults = await webSearch(plan.searchQuery, 5);

    // Save sources attributed to this subagent (tagged with subagent task)
    await prisma.source.createMany({
      data: searchResults.map((r) => ({
        runId,
        url: r.url,
        title: r.title,
        snippet: r.snippet,
      })),
    });

    // Fetch top pages and persist rawMarkdown back to source records
    const fetched: Array<{ url: string; title?: string; markdown: string }> = [];
    const results = await Promise.allSettled(
      searchResults.slice(0, 3).map((r) => fetchPage(r.url))
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        const page = result.value;
        fetched.push({ url: page.url, title: page.title ?? undefined, markdown: page.markdown });
        await prisma.source.updateMany({
          where: { runId, url: page.url },
          data: { rawMarkdown: page.markdown, title: page.title ?? undefined },
        });
      }
    }

    const sourceDocs =
      fetched.length > 0
        ? fetched
        : searchResults.map((r) => ({ url: r.url, title: r.title, markdown: r.snippet ?? "" }));

    // Synthesize with assigned model
    const { result: synthesis, resolvedModel } = await synthesize(
      plan.task,
      sourceDocs,
      plan.model
    );

    const output = JSON.stringify({ ...synthesis, resolvedModel });

    await prisma.subagent.update({
      where: { id: subagentId },
      data: { status: "completed", output, finishedAt: new Date() },
    });

    console.log(`[worker] Subagent [${resolvedModel}] done: "${plan.task}"`);
    publishEvent(runId, "subagent", { subagentId, model: resolvedModel, task: plan.task, status: "completed" });
    return output;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await prisma.subagent.update({
      where: { id: subagentId },
      data: { status: "failed", error: errMsg, finishedAt: new Date() },
    });
    publishEvent(runId, "subagent", { subagentId, model: plan.model, task: plan.task, status: "failed" });
    console.warn(`[worker] Subagent failed: "${plan.task}" — ${errMsg}`);
    return "";
  }
}

async function processJob(job: Job<JobData>) {
  const { taskId, goal, model } = job.data;

  // For scheduled jobs, runId may be absent -- create a fresh run
  let runId = job.data.runId;
  if (!runId) {
    const newRun = await prisma.run.create({
      data: { taskId, status: "queued" },
    });
    runId = newRun.id;
  }

  console.log(`[worker] Processing run ${runId} for task ${taskId} (model: ${model})`);

  await prisma.run.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "running" },
  });

  // Prepend attachment context to the goal if any files were uploaded
  const attachments = await prisma.taskAttachment.findMany({
    where: { taskId },
    select: { filename: true, text: true },
  });
  const attachmentContext = attachments
    .map((a) => `[Attached: ${a.filename}]\n${a.text.slice(0, 5000)}`)
    .join("\n\n");
  const enrichedGoal = attachmentContext
    ? `${attachmentContext}\n\nResearch goal: ${goal}`
    : goal;

  try {
    // ─── Step 1: Plan — decompose goal into subtasks ──────────────────────
    const planStep = await prisma.step.create({
      data: {
        runId,
        type: "search",
        status: "running",
        startedAt: new Date(),
        inputJson: JSON.stringify({ goal: enrichedGoal }),
      },
    });
    publishEvent(runId, "step", { step: "plan", status: "running" });

    let plans: SubtaskPlan[] = [];
    try {
      plans = await decomposeGoal(enrichedGoal, model);
      console.log(`[worker] Decomposed into ${plans.length} subtasks`);
      await updateStep(planStep.id, "completed", {
        outputJson: JSON.stringify({ subtasks: plans.length }),
      });
      publishEvent(runId, "step", { step: "plan", status: "completed", subtasks: plans.length });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await updateStep(planStep.id, "failed", { error: errMsg });
      publishEvent(runId, "step", { step: "plan", status: "failed", error: errMsg });
      throw err;
    }

    // ─── Step 2: Fetch — create subagents & run them in parallel ─────────
    const fetchStep = await prisma.step.create({
      data: {
        runId,
        type: "fetch",
        status: "running",
        startedAt: new Date(),
        inputJson: JSON.stringify({ subtasks: plans.map((p) => p.task) }),
      },
    });
    publishEvent(runId, "step", { step: "fetch", status: "running" });

    // Create all subagent records upfront so UI sees them immediately
    const subagentRecords = await Promise.all(
      plans.map((plan) =>
        prisma.subagent.create({
          data: {
            runId,
            task: plan.task,
            model: plan.model,
            status: "running",
          },
        })
      )
    );

    // Run all subagents in parallel
    const subagentOutputs = await Promise.all(
      plans.map((plan, i) => runSubagent(subagentRecords[i].id, runId, plan))
    );

    await updateStep(fetchStep.id, "completed", {
      outputJson: JSON.stringify({ completed: subagentOutputs.filter(Boolean).length }),
    });
    publishEvent(runId, "step", { step: "fetch", status: "completed" });

    // ─── Step 3: Synthesize — merge all subagent outputs ────────────────
    const synthesizeStep = await prisma.step.create({
      data: {
        runId,
        type: "synthesize",
        status: "running",
        startedAt: new Date(),
        inputJson: JSON.stringify({ subagentCount: plans.length }),
      },
    });

    publishEvent(runId, "step", { step: "synthesize", status: "running" });

    try {
      const allSources = await prisma.source.findMany({ where: { runId } });
      const allDocs = allSources.map((s) => ({
        url: s.url,
        title: s.title ?? undefined,
        markdown: s.rawMarkdown ?? s.snippet ?? "",
      }));

      const mergedGoal = `${enrichedGoal}\n\nSubtask findings:\n${subagentOutputs
        .filter(Boolean)
        .map((o, i) => {
          try {
            const parsed = JSON.parse(o);
            return `[${plans[i].model}] ${plans[i].task}:\n${parsed.answer?.slice(0, 1000) ?? ""}`;
          } catch {
            return "";
          }
        })
        .filter(Boolean)
        .join("\n\n")}`;

      // Use streaming synthesis — publish token chunks to Redis
      const { result: synthesis, resolvedModel } = await synthesizeStream(
        mergedGoal,
        allDocs.slice(0, 10),
        model,
        (chunk) => publishEvent(runId, "token", { text: chunk })
      );

      await prisma.run.update({
        where: { id: runId },
        data: {
          output: JSON.stringify(synthesis),
          model: resolvedModel,
          status: "completed",
          finishedAt: new Date(),
        },
      });

      await prisma.task.update({
        where: { id: taskId },
        data: { status: "completed" },
      });

      await updateStep(synthesizeStep.id, "completed", {
        outputJson: JSON.stringify({ model: resolvedModel, citationCount: synthesis.citations.length }),
      });

      publishEvent(runId, "step", { step: "synthesize", status: "completed" });
      publishEvent(runId, "done", { status: "completed" });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await updateStep(synthesizeStep.id, "failed", { error: errMsg });
      publishEvent(runId, "step", { step: "synthesize", status: "failed", error: errMsg });
      throw err;
    }

    console.log(`[worker] Run ${runId} completed`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[worker] Run ${runId} failed:`, errMsg);

    await prisma.run.update({
      where: { id: runId },
      data: { status: "failed", error: errMsg, finishedAt: new Date() },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "failed" },
    });

    publishEvent(runId, "done", { status: "failed", error: errMsg });
    throw err;
  }
}

const worker = new Worker<JobData>("tasks", processJob, {
  connection,
  concurrency: 2,
});

worker.on("completed", (job) => console.log(`[worker] Job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`[worker] Job ${job?.id} failed:`, err.message));
worker.on("error", (err) => console.error("[worker] Worker error:", err));

console.log("[worker] Task worker started, waiting for jobs...");

process.on("SIGTERM", async () => { await worker.close(); await prisma.$disconnect(); process.exit(0); });
process.on("SIGINT",  async () => { await worker.close(); await prisma.$disconnect(); process.exit(0); });
