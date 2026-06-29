import { readFile, writeFile } from "node:fs/promises";

import type { Site } from "../lib/types.ts";
import { TASKS, taskById } from "./tasks.ts";
import { aggregate } from "./score.ts";
import { OUTPUT, TRANSCRIPTS, preflight, runTask } from "./engine.ts";

async function mergeSite(site: Site) {
  let existing: Site[] = [];
  try {
    existing = JSON.parse(await readFile(OUTPUT, "utf8")) as Site[];
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }

  const idx = existing.findIndex((s) => s.id === site.id);
  if (idx >= 0) existing[idx] = site;
  else existing.push(site);

  await writeFile(OUTPUT, JSON.stringify(existing, null, 2) + "\n");
  return existing;
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--task="));
  const taskId = arg?.slice("--task=".length) || process.env.HARNESS_TASK_ID;
  if (!taskId) {
    console.error("usage: tsx run-one.ts --task=<task-id>");
    console.error(`known tasks: ${TASKS.map((t) => t.id).join(", ")}`);
    process.exit(1);
  }

  const task = taskById(taskId);
  if (!task) {
    console.error(`unknown task: ${taskId}`);
    process.exit(1);
  }

  preflight();
  await mkdirSafe();

  const runs = Math.max(1, Number(process.env.HARNESS_RUNS || "1"));
  console.log(
    `agent web index — single site run\n` +
      `task: ${task.id} (${task.url})\n` +
      `goal: ${task.goal}\n` +
      `3 models x ${runs} run(s)\n`
  );

  const taskRuns = await runTask(task);
  const site = aggregate(task, taskRuns);
  const all = await mergeSite(site);

  console.log(
    `\n  -> ${task.id}: difficulty ${site.difficulty}, ` +
      Object.entries(site.results)
        .map(([m, r]) => `${m} ${Math.round(r.successRate * 100)}%`)
        .join(", ")
  );
  console.log(`\nwrote ${all.length} site(s) to ${OUTPUT}`);
}

async function mkdirSafe() {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(TRANSCRIPTS, { recursive: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
