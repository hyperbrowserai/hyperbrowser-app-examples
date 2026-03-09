import { describe, it, expect } from "vitest";
import { withTimeout, TimeoutError } from "../timeout";

describe("withTimeout", () => {
  it("resolves when promise completes before timeout", async () => {
    const result = await withTimeout(Promise.resolve(42), 1000);
    expect(result).toBe(42);
  });

  it("rejects with TimeoutError when promise exceeds timeout", async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 5000));
    await expect(withTimeout(slow, 50)).rejects.toThrow(TimeoutError);
  });

  it("propagates the original rejection if promise fails before timeout", async () => {
    const failing = Promise.reject(new Error("boom"));
    await expect(withTimeout(failing, 1000)).rejects.toThrow("boom");
  });

  it("TimeoutError includes the ms value in the message", async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      await withTimeout(slow, 100);
    } catch (err) {
      expect(err).toBeInstanceOf(TimeoutError);
      expect((err as TimeoutError).message).toContain("100ms");
    }
  });
});
