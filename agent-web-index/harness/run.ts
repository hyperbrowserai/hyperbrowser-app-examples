import { mkdir, writeFile } from "node:fs/promises";

import { MODELS, type Site } from "../lib/types.ts";
import { TASKS } from "./tasks.ts";
import { aggregate } from "./score.ts";
import { OUTPUT, TRANSCRIPTS, preflight, runTask } from "./engine.ts";

async function main() {
  preflight();
  await mkdir(TRANSCRIPTS, { recursive: true });
  const runs = Math.max(1, Number(process.env.HARNESS_RUNS || "3"));
  console.log(
    `agent web index harness\n` +
      `${TASKS.length} tasks x ${MODELS.length} models x ${runs} runs = ${TASKS.length * MODELS.length * runs} sessions\n`
  );

  const sites: Site[] = [];

  for (const task of TASKS) {
    const taskRuns = await runTask(task);
    const site = aggregate(task, taskRuns);
    sites.push(site);
    console.log(
      `  -> ${task.id}: difficulty ${site.difficulty}, ` +
        MODELS.map((m) => `${m} ${Math.round(site.results[m].successRate * 100)}%`).join(", ") +
        `\n`
    );
  }

  await writeFile(OUTPUT, JSON.stringify(sites, null, 2) + "\n");
  console.log(`wrote ${sites.length} sites to ${OUTPUT}`);
  console.log(`transcripts in ${TRANSCRIPTS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
