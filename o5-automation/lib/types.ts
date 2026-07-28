// ── Client → server ─────────────────────────────────────────────────────────
export interface RunRequest {
  /** Plain-English task, e.g. "get every job title on this careers page". */
  task: string;
  /** Optional explicit URL. If absent we try to pull one from the task text. */
  url?: string;
}

// ── Pipeline phases (left panel steps) ──────────────────────────────────────
export type Phase =
  | "remembering"
  | "running"
  | "learning"
  | "done"
  | "failed";

// ── Extracted result shape ──────────────────────────────────────────────────
export interface RunResult {
  /** Claude Computer Use's real final result (parsed as JSON when possible). */
  data: unknown;
  /** Measured Computer Use actions in order. */
  steps: string[];
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  exact: boolean;
}

// ── Per-site memory, surfaced to the UI ─────────────────────────────────────
export type MemoryMissReason = "no_memory_file";

export type MemoryGraphKind =
  | "selector"
  | "navigation"
  | "flow"
  | "repair"
  | "structure"
  | "environment";

export interface MemoryGraphEntry {
  id: string;
  kind: MemoryGraphKind;
  label: string;
  detail: string;
  reused: number;
}

export interface MemoryGraphData {
  entries: MemoryGraphEntry[];
}

export interface MemorySnapshot {
  domain: string;
  hit: boolean;
  priorRuns: number;
  selectors: number;
  repairs: number;
  navPaths: number;
  flows: number;
  notes: number;
  envFacts: number;
  graph: MemoryGraphData;
}

/** Measured comparison between the first recorded run and this one. */
export interface MemoryComparison {
  first: { at: number; steps: number; elapsedMs: number; inputTokens: number; outputTokens: number };
  current: { steps: number; elapsedMs: number; inputTokens: number; outputTokens: number };
}

// ── Streamed events (NDJSON, one JSON object per line) ───────────────────────
export type RunEvent =
  | { t: "init"; startedAt: number; model: string; task: string }
  | { t: "phase"; phase: Phase; at: number }
  // Hyperbrowser's embedded Claude Computer Use Live View.
  | { t: "live"; url: string | null; label: string }
  // Planner output: resolved URL + safety verdict.
  | { t: "plan"; url: string; note: string }
  // ── Memory ────────────────────────────────────────────────────────────────
  // Loaded before the agent starts. hit=false means exploration.
  | { t: "memory"; snapshot: MemorySnapshot; missReason: MemoryMissReason | null }
  | { t: "memory_reuse"; entries: string[] }
  | { t: "memory_repair_applied"; error: string; fix: string }
  | { t: "memory_learned"; graph: MemoryGraphData; selectors: number; navPaths: number; flows: number; repairs: number; envFacts: number; labels: string[]; stale: string[] }
  | { t: "memory_write"; selectors: number; navPaths: number; flows: number; repairs: number; notes: number; envFacts: number; bytes: number; pruned: number; created: boolean; graph: MemoryGraphData }
  | { t: "memory_comparison"; comparison: MemoryComparison }
  | { t: "run"; msg: string }
  | { t: "step"; label: string }
  | { t: "result"; result: RunResult }
  | { t: "usage"; usage: Usage }
  | { t: "done"; elapsedMs: number; ok: boolean }
  // Terminal, honest failures.
  | { t: "need_url" }
  | { t: "refused"; reason: string }
  | { t: "error"; message: string };

export type Emit = (e: RunEvent) => void;
