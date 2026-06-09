import type { Scan } from "./types";

const globalAny = globalThis as unknown as {
  __hyperHarnessScans?: Map<string, Scan>;
};

export const scans: Map<string, Scan> =
  globalAny.__hyperHarnessScans ?? new Map<string, Scan>();

if (!globalAny.__hyperHarnessScans) {
  globalAny.__hyperHarnessScans = scans;
}

export function generateScanId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
