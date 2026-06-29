import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { writeFile } from "node:fs/promises";

import { MODELS, type ModelId } from "../lib/types.ts";
import { type Task } from "./tasks.ts";
import { decideAction, type HistoryEntry } from "./models.ts";
import {
  openSession,
  closeSession,
  serialize,
  execute,
  describeAction,
} from "./browser.ts";
import {
  type RunRecord,
  type TaskRuns,
  type TranscriptStep,
} from "./score.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(HERE, ".env") });

export const TRANSCRIPTS = join(HERE, "transcripts");
export const OUTPUT = join(HERE, "..", "lib", "results.json");
export const STEP_CAP = 20;

export function preflight() {
  const required = [
    "HYPERBROWSER_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "GLM_BASE_URL",
    "GLM_MODEL",
    "GLM_API_KEY",
  ];
  const missing = required.filter((k) => !(process.env[k] || "").trim());
  if (missing.length) {
    console.error(
      `\nMissing values in ${join(HERE, ".env")}:\n` +
        missing.map((k) => `  - ${k}`).join("\n") +
        `\n\nFill them in harness/.env (NOT .env.example), then re-run.\n`
    );
    process.exit(1);
  }
}

export function runsPerModel(): number {
  return Math.max(1, Number(process.env.HARNESS_RUNS || "3"));
}

export async function runOnce(
  task: Task,
  model: ModelId,
  run: number
): Promise<RunRecord> {
  const steps: TranscriptStep[] = [];
  const history: HistoryEntry[] = [];
  const session = await openSession();

  try {
    await session.page.goto(task.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    for (let i = 0; i < STEP_CAP; i++) {
      if (await task.success(session.page).catch(() => false)) break;

      const obs = await serialize(session.page);
      const action = await decideAction(model, obs.text, task.goal, history);
      const label = describeAction(action, obs);

      let resultDetail = "done";
      if (action.action !== "done") {
        const res = await execute(session.page, action);
        resultDetail = res.detail;
      }

      const passedAfter = await task.success(session.page).catch(() => false);
      steps.push({
        step: i + 1,
        observation: obs.text,
        action,
        actionLabel: label,
        result: resultDetail,
        passedAfter,
      });
      history.push({ observation: obs.text, action, result: resultDetail });

      if (action.action === "done" || passedAfter) break;
    }

    const passed = await task.success(session.page).catch(() => false);
    const record: RunRecord = { taskId: task.id, model, run, passed, steps };

    await writeFile(
      join(TRANSCRIPTS, `${task.id}-${model}-run${run}.json`),
      JSON.stringify(record, null, 2)
    );
    return record;
  } catch (err) {
    const record: RunRecord = {
      taskId: task.id,
      model,
      run,
      passed: false,
      steps: [
        ...steps,
        {
          step: steps.length + 1,
          observation: "",
          action: { action: "done" },
          actionLabel: `harness error: ${err instanceof Error ? err.message : "unknown"}`,
          result: "error",
          passedAfter: false,
        },
      ],
    };
    await writeFile(
      join(TRANSCRIPTS, `${task.id}-${model}-run${run}.json`),
      JSON.stringify(record, null, 2)
    ).catch(() => undefined);
    return record;
  } finally {
    await closeSession(session);
  }
}

export async function runTask(task: Task): Promise<TaskRuns> {
  const runs = runsPerModel();
  const taskRuns = {} as TaskRuns;
  for (const model of MODELS) taskRuns[model] = [];

  for (const model of MODELS) {
    for (let run = 1; run <= runs; run++) {
      process.stdout.write(`  ${task.id} | ${model} | run ${run}/${runs} ... `);
      const rec = await runOnce(task, model, run);
      console.log(
        rec.passed ? `pass (${rec.steps.length} steps)` : `fail (${rec.steps.length} steps)`
      );
      taskRuns[model].push(rec);
    }
  }

  return taskRuns;
}
