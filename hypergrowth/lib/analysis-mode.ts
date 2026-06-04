import type {
  AnalysisMode,
  EffectiveAnalysisMode,
  LLMProviderMetadata,
} from "./types";

const modeCalls: Record<AnalysisMode, number> = {
  deterministic: 0,
  lean: 1,
  balanced: 2,
  full: 4,
};

const callsToMode: Record<number, AnalysisMode> = {
  0: "deterministic",
  1: "lean",
  2: "balanced",
  3: "full",
  4: "full",
};

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

  const serverMax = clampCalls(
    Number.parseInt(process.env.LLM_MAX_CALLS_PER_RUN ?? "2", 10)
  );
  const requestedCalls = modeCalls[requested];
  const allowedCalls = Math.min(requestedCalls, serverMax);
  const effectiveAnalysisMode = callsToMode[allowedCalls];
  const downgradeReason =
    allowedCalls < requestedCalls
      ? `Server LLM_MAX_CALLS_PER_RUN=${serverMax}.`
      : undefined;

  return {
    requestedAnalysisMode: requested,
    effectiveAnalysisMode,
    analysisMode:
      effectiveAnalysisMode === "deterministic"
        ? "live-deterministic"
        : "live-hybrid",
    allowedCalls,
    downgradeReason,
  };
}

function clampCalls(value: number): number {
  if (Number.isNaN(value)) return 2;
  if (value <= 0) return 0;
  if (value === 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 4;
}
