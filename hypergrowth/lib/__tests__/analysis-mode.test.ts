import { describe, expect, it } from "vitest";
import { resolveAnalysisMode } from "../analysis-mode";

describe("resolveAnalysisMode", () => {
  it("keeps deterministic live mode even when an LLM provider is configured", () => {
    const result = resolveAnalysisMode({
      requested: "deterministic",
      provider: {
        available: true,
        provider: "openai",
        model: "gpt-4.1-mini",
      },
    });

    expect(result).toMatchObject({
      requestedAnalysisMode: "deterministic",
      effectiveAnalysisMode: "deterministic",
      analysisMode: "live-deterministic",
      allowedCalls: 0,
    });
  });

  it("keeps full mode when the call cap is below the previous full threshold", () => {
    const previousCap = process.env.LLM_MAX_CALLS_PER_RUN;
    process.env.LLM_MAX_CALLS_PER_RUN = "1";

    try {
      const result = resolveAnalysisMode({
        requested: "full",
        provider: {
          available: true,
          provider: "openai",
          model: "gpt-4.1-mini",
        },
      });

      expect(result).toMatchObject({
        requestedAnalysisMode: "full",
        effectiveAnalysisMode: "full",
        analysisMode: "live-hybrid",
        allowedCalls: 1,
      });
      expect(result.downgradeReason).toBeUndefined();
    } finally {
      if (previousCap === undefined) {
        delete process.env.LLM_MAX_CALLS_PER_RUN;
      } else {
        process.env.LLM_MAX_CALLS_PER_RUN = previousCap;
      }
    }
  });

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
      requested: "full",
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
