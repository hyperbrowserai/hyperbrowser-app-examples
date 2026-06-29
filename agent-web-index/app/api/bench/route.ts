import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { findTaskByUrl, supportedUrls } from "@/lib/match-task";
import type { Site } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RunStatus = "idle" | "running" | "succeeded" | "failed" | "stopped";

type BenchRun = {
  status: RunStatus;
  logs: string[];
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  process: ChildProcessWithoutNullStreams | null;
  taskId: string | null;
  taskUrl: string | null;
  taskGoal: string | null;
};

type BenchGlobal = typeof globalThis & {
  __agentWebIndexBench?: BenchRun;
};

const ROOT = process.cwd();
const HARNESS_DIR = join(ROOT, "harness");
const RESULTS_PATH = join(ROOT, "lib", "results.json");
const MAX_LOG_LINES = 500;

function state(): BenchRun {
  const g = globalThis as BenchGlobal;
  if (!g.__agentWebIndexBench) {
    g.__agentWebIndexBench = {
      status: "idle",
      logs: [],
      startedAt: null,
      endedAt: null,
      exitCode: null,
      process: null,
      taskId: null,
      taskUrl: null,
      taskGoal: null,
    };
  }
  return g.__agentWebIndexBench;
}

function resetToIdle(run: BenchRun) {
  if (run.process) return;
  run.status = "idle";
  run.logs = [];
  run.startedAt = null;
  run.endedAt = null;
  run.exitCode = null;
  run.taskId = null;
  run.taskUrl = null;
  run.taskGoal = null;
}

async function clearResultsFile() {
  await writeFile(RESULTS_PATH, "[]\n");
}

function pushLog(run: BenchRun, chunk: Buffer, prefix = "") {
  const lines = chunk
    .toString("utf8")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => `${prefix}${line}`);

  run.logs.push(...lines);
  if (run.logs.length > MAX_LOG_LINES) {
    run.logs.splice(0, run.logs.length - MAX_LOG_LINES);
  }
}

async function readSites(): Promise<Site[]> {
  try {
    const raw = await readFile(RESULTS_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Site[]) : [];
  } catch {
    return [];
  }
}

async function resultsInfo() {
  try {
    const [stats, sites] = await Promise.all([stat(RESULTS_PATH), readSites()]);
    return {
      exists: sites.length > 0,
      siteCount: sites.length,
      updatedAt: stats.mtime.toISOString(),
      sites,
    };
  } catch {
    return { exists: false, siteCount: 0, updatedAt: null, sites: [] as Site[] };
  }
}

async function payload() {
  const run = state();
  const includeResults = run.status === "running" || run.status === "succeeded";
  const results = includeResults
    ? await resultsInfo()
    : { exists: false, siteCount: 0, updatedAt: null, sites: [] as Site[] };
  const latestSite =
    run.taskId != null
      ? results.sites.find((s) => s.id === run.taskId) ?? null
      : null;

  return {
    status: run.status,
    logs: run.logs,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    exitCode: run.exitCode,
    taskId: run.taskId,
    taskUrl: run.taskUrl,
    taskGoal: run.taskGoal,
    latestSite,
    results: {
      exists: results.exists,
      siteCount: results.siteCount,
      updatedAt: results.updatedAt,
    },
  };
}

function spawnHarness(run: BenchRun, args: string[], intro: string[]) {
  run.status = "running";
  run.logs = intro;
  run.startedAt = new Date().toISOString();
  run.endedAt = null;
  run.exitCode = null;

  const child = spawn("npx", ["tsx", ...args], {
    cwd: HARNESS_DIR,
    env: { ...process.env, HARNESS_RUNS: "1" },
  });
  run.process = child;

  child.stdout.on("data", (chunk: Buffer) => pushLog(run, chunk));
  child.stderr.on("data", (chunk: Buffer) => pushLog(run, chunk, "stderr: "));
  child.on("error", (err) => {
    run.logs.push(`failed to start harness: ${err.message}`);
    run.status = "failed";
    run.endedAt = new Date().toISOString();
    run.process = null;
  });
  child.on("close", (code) => {
    run.exitCode = code;
    run.status = code === 0 ? "succeeded" : "failed";
    run.endedAt = new Date().toISOString();
    run.process = null;
    run.logs.push(
      code === 0 ? "run finished — results updated below" : `run exited with code ${code}`
    );
  });
}

export async function GET(request: Request) {
  const run = state();
  const reset = new URL(request.url).searchParams.get("reset") === "1";
  // Only clear stale state on an explicit fresh-page reset — never wipe logs
  // from a completed run while the client is still polling.
  if (reset && run.status !== "running") resetToIdle(run);
  return Response.json(await payload());
}

export async function POST(request: Request) {
  const run = state();
  if (run.status === "running" && run.process) {
    return Response.json(await payload(), { status: 409 });
  }

  resetToIdle(run);

  let body: { url?: string; mode?: "all" | "one" } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  await clearResultsFile();

  if (body.mode === "all" || !body.url) {
    spawnHarness(run, ["run.ts"], [
      "starting full benchmark from the app",
      `cwd: ${HARNESS_DIR}`,
    ]);
    return Response.json(await payload(), { status: 202 });
  }

  const task = findTaskByUrl(body.url);
  if (!task) {
    return Response.json(
      {
        error: "no benchmark task for this url yet",
        supportedUrls: supportedUrls(),
      },
      { status: 400 }
    );
  }

  run.taskId = task.id;
  run.taskUrl = task.url;
  run.taskGoal = task.goal;
  spawnHarness(
    run,
    ["run-one.ts", `--task=${task.id}`],
    [
      `starting real run for ${task.name}`,
      `url: ${task.url}`,
      `goal: ${task.goal}`,
    ]
  );

  return Response.json(await payload(), { status: 202 });
}

export async function DELETE() {
  const run = state();
  if (run.process) {
    run.process.kill("SIGTERM");
    run.logs.push("stop requested from the app");
  }
  run.status = "stopped";
  run.endedAt = new Date().toISOString();
  run.process = null;
  return Response.json(await payload());
}
