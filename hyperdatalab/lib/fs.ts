import fs from 'fs';
import path from 'path';

export function canWritePublic(): boolean {
  // Vercel (and many serverless platforms) mount the app directory read-only.
  // In those environments, avoid writing under process.cwd()/public.
  // We still allow writes locally (dev) and in non-Vercel environments.
  return !process.env.VERCEL;
}

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


