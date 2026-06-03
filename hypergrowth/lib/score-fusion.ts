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
}: {
  signals: PainSignal[];
  scores: SignalScore[];
  judgments: LLMJudgment[];
}): { signals: PainSignal[]; scores: SignalScore[] } {
  if (judgments.length === 0) return { signals, scores };

  const judgmentById = new Map(judgments.map((judgment) => [judgment.signalId, judgment]));
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
    if (!judgment) return score;

    const relevance = Math.max(score.relevance, 0.9 * judgment.contextualRelevance);
    const painIntensity =
      0.45 * score.painIntensity + 0.55 * judgment.impliedPainIntensity;
    const commercialIntent =
      0.35 * score.commercialIntent + 0.65 * judgment.impliedCommercialIntent;
    const hyperbrowserFit =
      0.45 * score.hyperbrowserFit + 0.55 * judgment.hyperbrowserFit;
    const confidence = 0.6 * score.confidence + 0.4 * judgment.confidence;
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
        ...score.reasons,
        ...judgment.reasoning.map((reason) => `LLM: ${reason}`),
        ...(judgment.isActionable ? [] : ["LLM: marked as not actionable"]),
      ],
    };
  });

  return { signals: fusedSignals, scores: fusedScores };
}
