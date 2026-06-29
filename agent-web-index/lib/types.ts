// Shared types for the agent web index.
//
// THE SEAM: the harness (../harness) writes results in this exact shape to
// lib/results.json, and the app renders only from that file. No types or
// constants here depend on the app runtime, so the harness imports this
// module directly (import type) to guarantee its output matches.

export type ModelId = "glm-5.2" | "claude-opus-4-8" | "gpt-5.5";

export type ModelResult = { successRate: number; breaks: string };

// screenshot = /public path, optional. when absent the browser window
// renders a stylized monochrome wireframe for the step instead.
export type RunStep = { action: string; screenshot?: string };

export type Site = {
  id: string;
  label: string;
  url: string;
  obstacles: string[];
  difficulty: number; // 0-100, computed from real success rates
  results: Record<ModelId, ModelResult>;
  replay: RunStep[];
};

export const MODELS: ModelId[] = ["glm-5.2", "claude-opus-4-8", "gpt-5.5"];

export const MODEL_LABELS: Record<ModelId, string> = {
  "glm-5.2": "glm-5.2",
  "claude-opus-4-8": "claude opus 4.8",
  "gpt-5.5": "gpt-5.5",
};
