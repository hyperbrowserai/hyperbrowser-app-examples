import { describe, it, expect } from "vitest";
import { resolveModel, MODELS } from "../llm";

describe("synthesizeStream prerequisites", () => {
  it("resolveModel returns valid model ids that exist in MODELS", () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key";
    try {
      const model = resolveModel("auto");
      expect(model in MODELS).toBe(true);

      const explicit = resolveModel("claude-sonnet-4-6");
      expect(explicit).toBe("claude-sonnet-4-6");
    } finally {
      if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
      else delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("all models have a valid provider for stream routing", () => {
    const validProviders = ["anthropic", "openai", "google"];
    for (const [id, meta] of Object.entries(MODELS)) {
      expect(
        validProviders.includes(meta.provider),
        `${id} has unknown provider: ${meta.provider}`
      ).toBe(true);
    }
  });

  it("streaming synthesis requires the same model registry as non-streaming", () => {
    const modelIds = Object.keys(MODELS);
    expect(modelIds.length).toBeGreaterThanOrEqual(5);
    expect(modelIds).toContain("claude-sonnet-4-6");
    expect(modelIds).toContain("gpt-5-mini");
    expect(modelIds).toContain("gemini-3-flash-preview");
  });
});
