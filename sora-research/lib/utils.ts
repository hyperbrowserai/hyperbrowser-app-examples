import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function saveFile(filePath: string, data: Buffer | string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, data);
}

export async function readJSON<T>(filePath: string): Promise<T> {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

// Simple per-file write queue to avoid concurrent writes clobbering
const pendingWrites = new Map<string, Promise<void>>();

export async function saveJSON(filePath: string, data: unknown): Promise<void> {
  const write = async () => {
    await ensureDir(path.dirname(filePath));
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
    await fs.rename(tempPath, filePath);
  };

  const last = pendingWrites.get(filePath) || Promise.resolve();
  const next = last.then(write, write).finally(() => {
    // Clean up only if this is still the latest promise
    if (pendingWrites.get(filePath) === next) {
      pendingWrites.delete(filePath);
    }
  });
  pendingWrites.set(filePath, next);
  return next;
}

export function getRunDir(runId: string): string {
  return path.join(process.cwd(), 'public', 'runs', runId);
}

export function getRunPublicPath(runId: string): string {
  return `/runs/${runId}`;
}

export const RunIdSchema = z.string().uuid();

export function isValidRunId(runId: unknown): runId is string {
  return RunIdSchema.safeParse(runId).success;
}
