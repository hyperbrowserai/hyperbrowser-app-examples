import type { Scan } from "./types";

const globalAny = globalThis as unknown as { __agentRankScans?: Map<string, Scan> };

export const scans: Map<string, Scan> =
  globalAny.__agentRankScans ?? new Map<string, Scan>();

if (!globalAny.__agentRankScans) {
  globalAny.__agentRankScans = scans;
}

export function generateScanId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
