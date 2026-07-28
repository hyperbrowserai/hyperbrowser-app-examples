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
  scriptMaxTokens: 8_192,

  /** Hard cap on generated-script execution (spec: 90s). */
  runTimeoutMs: intEnv("RUN_TIMEOUT_SECONDS", 90) * 1000,
  /** Sandbox image with node + chromium + playwright-core preinstalled. */
  sandboxImage: process.env.SANDBOX_IMAGE || "node-chromium",

  /** Timeouts for the inspection browser we drive ourselves. */
  inspectNavTimeoutMs: intEnv("INSPECT_NAV_TIMEOUT_MS", 30_000),
  /** How long to wait for the sandbox to have deps ready. */
  sandboxSetupTimeoutMs: intEnv("SANDBOX_SETUP_TIMEOUT_MS", 60_000),

  /** Send generous page structure while bounding pathological pages. */
  perCaptureCharCap: intEnv("PER_CAPTURE_CHAR_CAP", 120_000),
} as const;

/** Where inside the sandbox the generated script + its deps live. */
export const SANDBOX_PATHS = {
  workDir: "/home/ubuntu/run",
  scriptFile: "/home/ubuntu/run/automation.ts",
  screenshotFile: "/home/ubuntu/run/final.png",
  /** playwright-core ships preinstalled here on the node-chromium image. */
  playwrightNodePath: "/usr/local/lib/hb-playwright/node_modules",
} as const;
