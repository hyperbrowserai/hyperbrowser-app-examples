import { describe, expect, it } from "vitest";
import { resolveAnalysisMode } from "../analysis-mode";

describe("resolveAnalysisMode", () => {
  it("forces deterministic live mode when no LLM provider is configured", () => {
    const result = resolveAnalysisMode({
      requested: "full",
      provider: { available: false },
    });

    expect(result).toMatchObject({
      requestedAnalysisMode: "full",
      effectiveAnalysisMode: "deterministic",
      analysisMode: "live-deterministic",
      allowedCalls: 0,
    });
  });

  it("marks demo mode as deterministic even when an LLM is available", () => {
    const result = resolveAnalysisMode({
      requested: "balanced",
      provider: {
        available: true,
        provider: "openrouter",
        model: "glm-5.1",
      },
      isDemo: true,
    });

    expect(result.analysisMode).toBe("demo");
    expect(result.effectiveAnalysisMode).toBe("deterministic");
  });
});
