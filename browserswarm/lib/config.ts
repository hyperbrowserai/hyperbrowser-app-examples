function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Central config. Every browser/budget number the UI shows traces back here or
 * to a live measurement — nothing is decorative.
 */
export const CONFIG = {
  /** Max concurrent Hyperbrowser scrape jobs. Hyperbrowser exposes no
   * concurrency-limit endpoint in the SDK, so this is the honest ceiling. */
  maxBrowsers: intEnv("MAX_BROWSERS", 25),
  /** Real browser sessions with Live View driven for the hero tiles. */
  heroCount: intEnv("HERO_BROWSERS", 6),

  /** K3 context buffer cap (est tokens). Kept below the 1M model limit. */
  contextBudgetTokens: intEnv("CONTEXT_BUDGET_TOKENS", 700_000),
  contextHardLimit: 1_000_000,
  /** Per-page markdown character cap so one huge page can't eat the budget. */
  perPageCharCap: intEnv("PER_PAGE_CHAR_CAP", 60_000),

  scrapeTimeoutMs: intEnv("SCRAPE_TIMEOUT_MS", 30_000),
  heroNavTimeoutMs: intEnv("HERO_NAV_TIMEOUT_MS", 25_000),

  moonshotBaseUrl: process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1",
  moonshotModel: process.env.MOONSHOT_MODEL || "kimi-k3",
  /** Approx K3 input price, USD per 1M tokens. Surfaced as an estimate only. */
  k3InputPricePerM: 3,
} as const;
