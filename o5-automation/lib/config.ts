function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Central config. Every number the UI surfaces traces back here or to a live
 * measurement — nothing is decorative.
 */
export const CONFIG = {
  model: "claude-opus-5",

  /** Opus 5 model pricing, USD per 1M tokens. */
  modelInputPricePerM: 5,
  modelOutputPricePerM: 25,
  jsonMaxTokens: 1_024,

  /** Claude Computer Use runtime, verified against @hyperbrowser/sdk types. */
  computerUseMaxSteps: intEnv("COMPUTER_USE_MAX_STEPS", 20),
  computerUseMaxFailures: intEnv("COMPUTER_USE_MAX_FAILURES", 3),
  computerUsePollMs: intEnv("COMPUTER_USE_POLL_MS", 2_000),
  computerUseMaxPollFailures: intEnv("COMPUTER_USE_MAX_POLL_FAILURES", 5),
  computerUseTimeoutMinutes: intEnv("COMPUTER_USE_TIMEOUT_MINUTES", 5),

  /** Per-site navigation memory, stored as one JSON file per domain. */
  /** Hard cap per domain file. Past this we prune unreused entries. */
  memoryMaxBytes: intEnv("MEMORY_MAX_BYTES", 64_000),
  /** Per-category entry caps, applied before the byte cap. */
  memoryMaxSelectors: intEnv("MEMORY_MAX_SELECTORS", 60),
  memoryMaxNavPaths: intEnv("MEMORY_MAX_NAV_PATHS", 12),
  memoryMaxFlows: intEnv("MEMORY_MAX_FLOWS", 20),
  memoryMaxNotes: intEnv("MEMORY_MAX_NOTES", 8),
  memoryMaxEnvFacts: intEnv("MEMORY_MAX_ENV_FACTS", 12),
  /** Runs kept for the first-vs-repeat comparison (the first is always kept). */
  memoryMaxRunHistory: intEnv("MEMORY_MAX_RUN_HISTORY", 20),
} as const;
