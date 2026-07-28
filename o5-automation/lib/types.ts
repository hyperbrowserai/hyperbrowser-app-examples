// ── Client → server ─────────────────────────────────────────────────────────
export interface RunRequest {
  /** Plain-English task, e.g. "get every job title on this careers page". */
  task: string;
  /** Optional explicit URL. If absent we try to pull one from the task text. */
  url?: string;
  /** Optional login creds — forwarded to the run as env, never written to the
   *  script, never persisted, never logged. */
  username?: string;
  password?: string;
}

// ── Pipeline phases (left panel steps) ──────────────────────────────────────
export type Phase =
  | "inspecting"
  | "writing"
  | "running"
  | "repairing"
  | "done"
  | "failed";

// ── Extracted result shape ──────────────────────────────────────────────────
export interface RunResult {
  /** Whatever the script printed via @@RESULT@@ (parsed JSON, else raw string). */
  data: unknown;
  /** Full stdout from the sandbox run. */
  stdout: string;
  /** Final-page screenshot, base64 PNG (data URI body only), or null. */
  screenshotB64: string | null;
  /** @@STEP@@ labels the script announced, in order. */
  steps: string[];
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  exact: boolean;
}

// ── Streamed events (NDJSON, one JSON object per line) ───────────────────────
export type RunEvent =
  | { t: "init"; startedAt: number; model: string; task: string }
  | { t: "phase"; phase: Phase; at: number }
  // The Live View URL for whichever session is currently on screen (inspect,
  // then the execution session).
  | { t: "live"; url: string | null; label: string }
  // Planner output: resolved URL + safety verdict.
  | { t: "plan"; url: string; note: string }
  | { t: "inspect"; msg: string; elements?: number; links?: number; forms?: number; chars?: number }
  // K3 streaming the script into view.
  | { t: "script_delta"; delta: string }
  | { t: "script_done"; script: string; phase: Phase }
  | { t: "run"; msg: string }
  | { t: "step"; label: string }
  | { t: "repair"; attempt: number; reason: string }
  | { t: "result"; result: RunResult; repaired: boolean }
  | { t: "usage"; usage: Usage }
  | { t: "done"; elapsedMs: number; repaired: boolean; ok: boolean }
  // Terminal, honest failures.
  | { t: "need_url" }
  | { t: "refused"; reason: string }
  | { t: "error"; message: string };

export type Emit = (e: RunEvent) => void;
