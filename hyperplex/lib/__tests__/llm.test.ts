import { describe, it, expect } from "vitest";
import { resolveModel, MODELS } from "../llm";

describe("resolveModel", () => {
  it("returns the model id if it exists in MODELS", () => {
    const result = resolveModel("claude-sonnet-4-6");
    expect(result).toBe("claude-sonnet-4-6");
  });

  it("falls back to auto resolution when given an unknown model id", () => {
    // This will throw if no API keys are set
    expect(() => resolveModel("nonexistent-model")).toThrow("No API keys found");
  });

  it("resolves 'auto' to first model with available key", () => {
    // With ANTHROPIC_API_KEY set in env
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key";
    try {
      const result = resolveModel("auto");
      expect(result).toBe("claude-sonnet-4-6");
    } finally {
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    }
  });
});

describe("MODELS registry", () => {
  it("contains all expected providers", () => {
    const providers = new Set(Object.values(MODELS).map((m) => m.provider));
    expect(providers).toContain("anthropic");
    expect(providers).toContain("openai");
    expect(providers).toContain("google");
  });

  it("every model has a label and apiKeyEnv", () => {
    for (const [id, meta] of Object.entries(MODELS)) {
      expect(meta.label, `${id} missing label`).toBeTruthy();
      expect(meta.apiKeyEnv, `${id} missing apiKeyEnv`).toBeTruthy();
    }
  });
});
