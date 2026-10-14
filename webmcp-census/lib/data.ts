import { promises as fs } from "fs";
import path from "path";
import type { CensusRun } from "./types";

export const RESULTS_PATH = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "results.json");
export const FIXTURE_PATH = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "fixtures",
  "sample-results.json"
);

export type LoadedRun = { run: CensusRun; source: "results" | "fixture" };

/** Prefer the latest CLI output; fall back to the committed fixture. */
export async function loadRun(): Promise<LoadedRun | null> {
  for (const [file, source] of [
    [RESULTS_PATH, "results"],
    [FIXTURE_PATH, "fixture"],
  ] as const) {
    try {
      const run = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ file, "utf8")) as CensusRun;
      return { run, source };
    } catch {
      continue;
    }
  }
  return null;
}
