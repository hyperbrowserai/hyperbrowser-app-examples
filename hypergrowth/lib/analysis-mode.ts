import type {
  AnalysisMode,
  EffectiveAnalysisMode,
  LLMProviderMetadata,
} from "./types";

const defaultFullModeCallCap = 12;

export type AnalysisModeResolution = {
  requestedAnalysisMode: AnalysisMode;
  effectiveAnalysisMode: AnalysisMode;
  analysisMode: EffectiveAnalysisMode;
  allowedCalls: number;
  downgradeReason?: string;
};

export function resolveAnalysisMode({
  requested,
  provider,
  isDemo = false,
}: {
  requested: AnalysisMode;
  provider: LLMProviderMetadata;
  isDemo?: boolean;
}): AnalysisModeResolution {
  if (isDemo) {
    return {
      requestedAnalysisMode: requested,
      effectiveAnalysisMode: "deterministic",
      analysisMode: "demo",
      allowedCalls: 0,
      downgradeReason: "No Hyperbrowser API key configured; demo mode uses deterministic sample data.",
    };
  }

  if (!provider.available) {
    return {
      requestedAnalysisMode: requested,
      effectiveAnalysisMode: "deterministic",
      analysisMode: "live-deterministic",
      allowedCalls: 0,
      downgradeReason: "No LLM provider configured.",
    };
  }

  if (requested === "deterministic") {
    return {
      requestedAnalysisMode: requested,
      effectiveAnalysisMode: "deterministic",
      analysisMode: "live-deterministic",
      allowedCalls: 0,
    };
  }

  const allowedCalls = clampCalls(
    Number.parseInt(
      process.env.LLM_MAX_CALLS_PER_RUN ?? String(defaultFullModeCallCap),
      10
    )
  );

  return {
    requestedAnalysisMode: requested,
    effectiveAnalysisMode: "full",
    analysisMode: "live-hybrid",
    allowedCalls,
  };
}

function clampCalls(value: number): number {
  if (Number.isNaN(value)) return defaultFullModeCallCap;
  if (value <= 0) return 0;
  return Math.min(value, 50);
}
