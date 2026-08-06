import {
  commercialTerms,
  hyperbrowserFitTerms,
  painTerms,
  sourceReliability,
} from "./taxonomy";
import { clamp01, countMatches, roundScore, tokenize } from "./text";
import type { PainSignal, SignalScore } from "./types";

const weights = {
  relevance: 0.22,
  painIntensity: 0.2,
  hyperbrowserFit: 0.18,
  commercialIntent: 0.16,
  recency: 0.1,
  sourceReliability: 0.08,
  confidence: 0.06,
};

export function scoreSignals(query: string, signals: PainSignal[]): SignalScore[] {
  return signals.map((signal) => scoreSignal(query, signal));
}

export function scoreSignal(query: string, signal: PainSignal): SignalScore {
  const text = `${signal.title} ${signal.quote}`;
  const queryTokens = tokenize(query);
  const textTokens = new Set(tokenize(text));
  const matchedQueryTokens = queryTokens.filter((token) => textTokens.has(token));
  const relevance = queryTokens.length
    ? clamp01(matchedQueryTokens.length / queryTokens.length)
    : 0.5;
  const painIntensity = clamp01(
    0.18 + countMatches(text, painTerms) * 0.14 + urgencyBoost(signal.urgency)
  );
  const hyperbrowserFit = clamp01(
    0.12 +
      countMatches(text, hyperbrowserFitTerms) * 0.105 +
      (signal.ecosystemBoost ? 0.08 : 0)
  );
  const commercialIntent = clamp01(0.1 + countMatches(text, commercialTerms) * 0.13);
  const recency = scoreRecency(signal.publishedAt);
  const reliability = clamp01(
    signal.sourceReliabilityOverride ?? sourceReliability[signal.source]
  );
  const confidence = clamp01(
    0.34 +
      (signal.quote.length > 90 ? 0.18 : 0.08) +
      (signal.canonicalUrl ? 0.14 : 0) +
      (signal.toolsMentioned.length > 0 ? 0.12 : 0) +
      (signal.matchedTerms.length > 0 ? 0.12 : 0)
  );

  const total =
    weights.relevance * relevance +
    weights.painIntensity * painIntensity +
    weights.hyperbrowserFit * hyperbrowserFit +
    weights.commercialIntent * commercialIntent +
    weights.recency * recency +
    weights.sourceReliability * reliability +
    weights.confidence * confidence;

  return {
    signalId: signal.id,
    relevance: roundScore(relevance),
    painIntensity: roundScore(painIntensity),
    commercialIntent: roundScore(commercialIntent),
    hyperbrowserFit: roundScore(hyperbrowserFit),
    recency: roundScore(recency),
    sourceReliability: roundScore(reliability),
    confidence: roundScore(confidence),
    total: roundScore(total),
    reasons: buildReasons({
      matchedQueryTokens,
      signal,
      painIntensity,
      hyperbrowserFit,
      commercialIntent,
    }),
  };
}

export function getScore(
  scores: SignalScore[],
  signalId: string
): SignalScore | undefined {
  return scores.find((score) => score.signalId === signalId);
}

function urgencyBoost(urgency: PainSignal["urgency"]): number {
  if (urgency === "high") return 0.28;
  if (urgency === "medium") return 0.16;
  return 0.04;
}

function scoreRecency(publishedAt?: string): number {
  if (!publishedAt) return 0.45;

  const timestamp = Date.parse(publishedAt);
  if (Number.isNaN(timestamp)) return 0.45;

  const daysOld = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  return clamp01(Math.exp(-daysOld / 365));
}

function buildReasons({
  matchedQueryTokens,
  signal,
  painIntensity,
  hyperbrowserFit,
  commercialIntent,
}: {
  matchedQueryTokens: string[];
  signal: PainSignal;
  painIntensity: number;
  hyperbrowserFit: number;
  commercialIntent: number;
}): string[] {
  const reasons: string[] = [];

  if (matchedQueryTokens.length > 0) {
    reasons.push(`Matches query terms: ${matchedQueryTokens.join(", ")}`);
  }

  if (painIntensity >= 0.65) {
    reasons.push(`High pain language detected (${signal.urgency} urgency)`);
  }

  if (hyperbrowserFit >= 0.55) {
    reasons.push("Maps to browser automation or web extraction problems");
  }

  if (commercialIntent >= 0.45) {
    reasons.push("Contains production, team, scale, or infrastructure language");
  }

  if (signal.source === "github") {
    reasons.push("GitHub issue signal tends to represent concrete implementation pain");
  }

  if (signal.ecosystemBoost) {
    reasons.push("Comes from a browser automation or agent ecosystem repository");
  }

  return reasons;
}
