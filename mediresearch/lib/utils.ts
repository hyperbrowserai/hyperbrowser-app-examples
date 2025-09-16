import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Generate a unique run ID for storing artifacts
 */
export function generateRunId(): string {
  return uuidv4();
}

/**
 * Create run directory for storing artifacts
 */
export async function createRunDirectory(runId: string): Promise<string> {
  const runDir = path.join(process.cwd(), 'public', 'runs', runId);
  await fs.mkdir(runDir, { recursive: true });
  return runDir;
}

/**
 * Save evidence markdown to run directory
 */
export async function saveEvidence(runId: string, content: string): Promise<string> {
  const runDir = await createRunDirectory(runId);
  const filePath = path.join(runDir, 'evidence.md');
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Sleep utility for retries
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Normalize test values for comparison
 */
export function normalizeTestValue(value: string | number): number | null {
  if (typeof value === 'number') return value;
  
  // Extract numeric value from string
  const numericMatch = value.toString().match(/(\d+\.?\d*)/);
  return numericMatch ? parseFloat(numericMatch[1]) : null;
}

/**
 * Determine test status based on value and reference range
 */
export function determineTestStatus(
  value: string | number,
  refRange: string
): 'normal' | 'high' | 'low' | 'critical' {
  const numValue = normalizeTestValue(value);
  if (numValue === null) return 'normal';
  
  // Parse reference range (e.g., "3.5-5.0", "< 10", "> 100")
  const rangeMatch = refRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
  const ltMatch = refRange.match(/[<≤]\s*(\d+\.?\d*)/);
  const gtMatch = refRange.match(/[>≥]\s*(\d+\.?\d*)/);
  
  if (rangeMatch) {
    const [, min, max] = rangeMatch;
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);
    
    if (numValue < minVal) return 'low';
    if (numValue > maxVal) return 'high';
    return 'normal';
  }
  
  if (ltMatch) {
    const maxVal = parseFloat(ltMatch[1]);
    return numValue > maxVal ? 'high' : 'normal';
  }
  
  if (gtMatch) {
    const minVal = parseFloat(gtMatch[1]);
    return numValue < minVal ? 'low' : 'normal';
  }
  
  return 'normal';
}

/**
 * Simple JSON file cache utilities (stored under public/cache/<category>)
 */
function getCacheDir(category: string): string {
  return path.join(process.cwd(), 'public', 'cache', category);
}

function getCacheFilePath(category: string, key: string): string {
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  return path.join(getCacheDir(category), `${hash}.json`);
}

export async function readCacheJson<T>(category: string, key: string, maxAgeMs: number): Promise<T | null> {
  try {
    const file = getCacheFilePath(category, key);
    const stat = await fs.stat(file);
    const age = Date.now() - stat.mtime.getTime();
    if (age > maxAgeMs) return null;
    const content = await fs.readFile(file, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeCacheJson(category: string, key: string, data: unknown): Promise<void> {
  const dir = getCacheDir(category);
  await fs.mkdir(dir, { recursive: true });
  const file = getCacheFilePath(category, key);
  await fs.writeFile(file, JSON.stringify(data), 'utf-8');
}
