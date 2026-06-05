import { clamp01, roundScore } from "./text";
import type { LLMJudgment, PainSignal, SignalScore } from "./types";

const weights = {
  relevance: 0.22,
  painIntensity: 0.2,
  hyperbrowserFit: 0.18,
  commercialIntent: 0.16,
  recency: 0.1,
  sourceReliability: 0.08,
  confidence: 0.06,
};

export function fuseLLMJudgments({
  signals,
  scores,
  judgments,
  fallbackReason,
}: {
  signals: PainSignal[];
  scores: SignalScore[];
  judgments: LLMJudgment[];
  fallbackReason?: string;
}): { signals: PainSignal[]; scores: SignalScore[] } {
  if (judgments.length === 0 && !fallbackReason) return { signals, scores };

  const judgmentById = new Map(
    judgments.map((judgment) => [judgment.signalId, judgment])
  );
  const fusedSignals = signals.map((signal) => {
    const judgment = judgmentById.get(signal.id);
    if (!judgment) return signal;

    return {
      ...signal,
      quote: judgment.representativeQuote || signal.quote,
      painCategory: judgment.category,
    };
  });
  const fusedScores = scores.map((score) => {
    const judgment = judgmentById.get(score.signalId);
    if (!judgment) {
      return fallbackReason
        ? {
            ...score,
            reasons: [
              ...score.reasons,
              `LLM: deterministic fallback (${fallbackReason})`,
            ],
          }
        : score;
    }

    const relevance = judgment.contextualRelevance;
    const painIntensity = judgment.impliedPainIntensity;
    const commercialIntent = judgment.impliedCommercialIntent;
    const hyperbrowserFit = judgment.hyperbrowserFit;
    const confidence = judgment.confidence;
    let total =
      weights.relevance * relevance +
      weights.painIntensity * painIntensity +
      weights.hyperbrowserFit * hyperbrowserFit +
      weights.commercialIntent * commercialIntent +
      weights.recency * score.recency +
      weights.sourceReliability * score.sourceReliability +
      weights.confidence * confidence;

    if (!judgment.isActionable) {
      total = Math.min(total, 0.25);
    }

    return {
      ...score,
      relevance: roundScore(clamp01(relevance)),
      painIntensity: roundScore(clamp01(painIntensity)),
      commercialIntent: roundScore(clamp01(commercialIntent)),
      hyperbrowserFit: roundScore(clamp01(hyperbrowserFit)),
      confidence: roundScore(clamp01(confidence)),
      total: roundScore(clamp01(total)),
      reasons: [
        "LLM: judged final score",
        ...judgment.reasoning.map((reason) => `LLM: ${reason}`),
        ...(judgment.isActionable ? [] : ["LLM: marked as not actionable"]),
      ],
    };
  });

  return { signals: fusedSignals, scores: fusedScores };
}
