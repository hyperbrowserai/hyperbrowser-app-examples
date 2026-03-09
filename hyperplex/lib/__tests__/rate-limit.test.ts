import { describe, it, expect, beforeEach, vi } from "vitest";

// Reset module between tests to get a fresh Map store
let checkRateLimit: typeof import("../rate-limit").checkRateLimit;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("../rate-limit");
  checkRateLimit = mod.checkRateLimit;
});

describe("checkRateLimit", () => {
  it("allows requests within the limit", () => {
    const r1 = checkRateLimit("test-key", 3, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit("test-key", 3, 60_000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it("blocks requests exceeding the limit", () => {
    checkRateLimit("flood", 2, 60_000);
    checkRateLimit("flood", 2, 60_000);
    const r3 = checkRateLimit("flood", 2, 60_000);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterMs).toBeGreaterThan(0);
  });

  it("uses separate buckets per key", () => {
    checkRateLimit("a", 1, 60_000);
    const rA = checkRateLimit("a", 1, 60_000);
    expect(rA.allowed).toBe(false);

    const rB = checkRateLimit("b", 1, 60_000);
    expect(rB.allowed).toBe(true);
  });
});
