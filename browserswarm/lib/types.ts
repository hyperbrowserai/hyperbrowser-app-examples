// ── Client request ────────────────────────────────────────────────────────
export interface SwarmRequest {
  question: string;
  seeds: string[];
}

export type TileStatus = "idle" | "active" | "done" | "failed";
export type HeroStatus = "spawning" | "live" | "failed";
export type Phase =
  | "spawning"
  | "scraping"
  | "synthesizing"
  | "answering"
  | "done"
  | "error";

// ── Streamed events (NDJSON, one JSON object per line) ──────────────────────
export type SwarmEvent =
  | {
      t: "init";
      startedAt: number;
      maxBrowsers: number;
      budgetTokens: number;
      hardLimit: number;
      totalSeeds: number;
      tiles: { id: number; url: string; host: string }[];
      hero: { id: number; url: string; host: string; liveUrl: string | null }[];
    }
  | { t: "tile"; id: number; status: TileStatus; title?: string; error?: string }
  | { t: "hero"; id: number; status: HeroStatus; liveUrl?: string | null; title?: string; error?: string }
  | { t: "ctx"; pagesRead: number; tokens: number; capped: boolean }
  | { t: "phase"; phase: Phase; msg?: string }
  | { t: "answer"; delta: string }
  | {
      t: "done";
      pages: number;
      sites: number;
      tokens: number;
      answerTokens: number;
      elapsedMs: number;
      capped: boolean;
      costUsd: number;
    }
  | { t: "error"; message: string };
