import type { ModelId, Site, ModelResult, RunStep } from "../lib/types.ts";
import { MODELS } from "../lib/types.ts";
import type { Task } from "./tasks.ts";

// One recorded step inside a run transcript.
export type TranscriptStep = {
  step: number;
  observation: string;
  action: unknown;
  actionLabel: string;
  result: string;
  passedAfter: boolean;
};

export type RunRecord = {
  taskId: string;
  model: ModelId;
  run: number;
  passed: boolean;
  steps: TranscriptStep[];
};

// All runs for a single task, grouped by model.
export type TaskRuns = Record<ModelId, RunRecord[]>;

function rate(runs: RunRecord[]): number {
  if (runs.length === 0) return 0;
  const passes = runs.filter((r) => r.passed).length;
  return passes / runs.length;
}

// Derive the "where it breaks" note from REAL transcripts — never invented.
// If the model ever passed, describe completion; otherwise summarize where a
// representative failed run actually stopped.
function breaksNote(runs: RunRecord[]): string {
  if (runs.length === 0) return "no runs recorded";
  const passes = runs.filter((r) => r.passed).length;
  if (passes === runs.length) return "completes the task on every run";
  if (passes > 0) return `inconsistent: passes ${passes} of ${runs.length} runs`;

  // all failed — point at the last action of the longest failed run
  const rep = [...runs].sort((a, b) => b.steps.length - a.steps.length)[0];
  const last = rep.steps[rep.steps.length - 1];
  if (!last) return "no actions taken before failing";
  return `stops after ${rep.steps.length} steps: ${last.actionLabel.toLowerCase()}`;
}

// Pick one REAL run to replay in the browser window. Prefer a representative
// run on the hardest (lowest-success) model so the recorded run shows where the
// web actually breaks the agents; fall back to any run with steps.
function pickReplay(taskRuns: TaskRuns): RunStep[] {
  const ordered = [...MODELS].sort((a, b) => rate(taskRuns[a]) - rate(taskRuns[b]));
  for (const m of ordered) {
    const withSteps = taskRuns[m].filter((r) => r.steps.length > 0);
    if (withSteps.length === 0) continue;
    // a failed run if available (shows the break), else the first run
    const chosen = withSteps.find((r) => !r.passed) ?? withSteps[0];
    const steps: RunStep[] = chosen.steps.map((s) => ({ action: s.actionLabel }));
    steps.push({
      action: chosen.passed ? "task complete" : "run ends here, task not completed",
    });
    return steps;
  }
  return [{ action: "no run recorded" }];
}

export function aggregate(task: Task, taskRuns: TaskRuns): Site {
  const results = {} as Record<ModelId, ModelResult>;
  let successSum = 0;
  for (const m of MODELS) {
    const r = rate(taskRuns[m]);
    results[m] = { successRate: r, breaks: breaksNote(taskRuns[m]) };
    successSum += r;
  }
  const meanSuccess = successSum / MODELS.length;
  const difficulty = Math.round((1 - meanSuccess) * 100);

  return {
    id: task.id,
    label: task.name,
    url: task.url,
    obstacles: task.obstacles,
    difficulty,
    results,
    replay: pickReplay(taskRuns),
  };
}
