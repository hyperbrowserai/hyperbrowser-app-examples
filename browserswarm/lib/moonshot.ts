import OpenAI from "openai";
import { CONFIG } from "./config";

// Kimi K3 speaks the OpenAI-compatible API. Server-side only.
let cached: OpenAI | null = null;

export function getMoonshot(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("MOONSHOT_API_KEY is not set");
  }
  cached = new OpenAI({ apiKey, baseURL: CONFIG.moonshotBaseUrl });
  return cached;
}

export type PreflightResult =
  | { ok: true; model: string }
  | { ok: false; reason: "missing_key" | "model_404" | "auth" | "error"; detail: string };

/**
 * 1-token preflight so a bad model string / missing key surfaces immediately
 * instead of crashing mid-run. Called from /api/preflight on page load.
 */
export async function preflightK3(): Promise<PreflightResult> {
  if (!process.env.MOONSHOT_API_KEY) {
    return { ok: false, reason: "missing_key", detail: "MOONSHOT_API_KEY is not set" };
  }
  try {
    const client = getMoonshot();
    await client.chat.completions.create({
      model: CONFIG.moonshotModel,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return { ok: true, model: CONFIG.moonshotModel };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const detail = err instanceof Error ? err.message : String(err);
    if (status === 404) {
      return {
        ok: false,
        reason: "model_404",
        detail: `Model "${CONFIG.moonshotModel}" returned 404. Check MOONSHOT_MODEL.`,
      };
    }
    if (status === 401 || status === 403) {
      return { ok: false, reason: "auth", detail: "MOONSHOT_API_KEY rejected (auth failed)" };
    }
    return { ok: false, reason: "error", detail };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Moonshot is capacity-strained: 429s are expected. Exponential backoff with
 * full jitter, capped attempts. Never throws on a single 429 — only after we
 * genuinely give up.
 */
export async function withMoonshotBackoff<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseMs?: number; onRetry?: (attempt: number, waitMs: number) => void } = {}
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 6;
  const baseMs = opts.baseMs ?? 800;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const retryable = status === 429 || (typeof status === "number" && status >= 500);
      if (!retryable || attempt === maxAttempts - 1) throw err;
      const exp = baseMs * 2 ** attempt;
      const waitMs = Math.min(20_000, Math.floor(exp / 2 + Math.random() * exp));
      opts.onRetry?.(attempt + 1, waitMs);
      await sleep(waitMs);
    }
  }
  throw lastErr;
}
