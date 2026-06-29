import { MODELS, type ModelId, type Site } from "@/lib/types";

// ASCII difficulty bar, e.g. asciiBar(82) -> "████████░░"
export function asciiBar(value: number, segments = 10): string {
  const filled = Math.round((value / 100) * segments);
  const clamped = Math.max(0, Math.min(segments, filled));
  return "█".repeat(clamped) + "░".repeat(segments - clamped);
}

export function pct(rate: number): string {
  return Math.round(rate * 100) + "%";
}

// difference is conveyed through opacity/weight, never color
export type RateTier = "tier-hi" | "tier-mid" | "tier-lo" | "tier-zero";

export function rateTier(rate: number): RateTier {
  if (rate >= 0.7) return "tier-hi";
  if (rate >= 0.4) return "tier-mid";
  if (rate >= 0.1) return "tier-lo";
  return "tier-zero";
}

export const TIER_CLASS: Record<RateTier, string> = {
  "tier-hi": "opacity-100 font-extrabold",
  "tier-mid": "opacity-80 font-bold",
  "tier-lo": "opacity-50 font-semibold",
  "tier-zero": "opacity-30 font-semibold",
};

export function bestModelFor(site: Site): ModelId {
  let best: ModelId = MODELS[0];
  let bestRate = -1;
  for (const m of MODELS) {
    const r = site.results[m].successRate;
    if (r > bestRate) {
      bestRate = r;
      best = m;
    }
  }
  return best;
}
