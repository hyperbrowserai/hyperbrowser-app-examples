import fs from 'fs';
import path from 'path';

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function writeFileSafe(filePath: string, data: Buffer | string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, data);
}

export function resolveRunPath(runId: string, ...segments: string[]): string {
  return path.join(process.cwd(), 'public', 'runs', runId, ...segments);
}


