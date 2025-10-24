import { randomUUID } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export function generateRunPath(id?: string) {
  const runId = id ?? randomUUID();
  const dir = join(process.cwd(), "public", "runs", runId);
  mkdirSync(dir, { recursive: true });
  return { runId, dir };
}

export function writeRunFile(dir: string, name: string, data: unknown) {
  const file = join(dir, name);
  writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data, null, 2), "utf8");
  return file;
}


