import { categoryLabels } from "./taxonomy";
import { clamp01, roundScore, unique } from "./text";
import type { PainCluster, PainSignal, SignalScore, Urgency } from "./types";

export function clusterSignals(
  signals: PainSignal[],
  scores: SignalScore[]
): PainCluster[] {
  const byCategory = new Map<string, PainSignal[]>();

  for (const signal of signals) {
    const existing = byCategory.get(signal.painCategory) ?? [];
    existing.push(signal);
    byCategory.set(signal.painCategory, existing);
  }

  return Array.from(byCategory.entries())
    .map(([category, categorySignals], index) =>
      buildCluster(`cluster-${index + 1}`, category, categorySignals, scores)
    )
    .sort((a, b) => (b.clusterStrength ?? 0) - (a.clusterStrength ?? 0));
}

function buildCluster(
  id: string,
  category: string,
  signals: PainSignal[],
  scores: SignalScore[]
): PainCluster {
  const sourceDiversity = unique(signals.map((signal) => signal.source)).length;
  const signalScores = signals
    .map((signal) => scores.find((score) => score.signalId === signal.id))
    .filter((score): score is SignalScore => Boolean(score));
  const averagePainIntensity = average(signalScores.map((score) => score.painIntensity));
  const averageHyperbrowserFit = average(
    signalScores.map((score) => score.hyperbrowserFit)
  );
  const confidence = average(signalScores.map((score) => score.confidence));
  const sourceDiversityBonus = (sourceDiversity - 1) * 0.18;
  const clusterStrength =
    Math.log1p(signals.length) *
    averagePainIntensity *
    averageHyperbrowserFit *
    (1 + sourceDiversityBonus);

  return {
    id,
    title: categoryLabels[category as keyof typeof categoryLabels] ?? category,
    summary: summarizeCluster(category, signals),
    frequency: signals.length,
    urgency: maxUrgency(signals.map((signal) => signal.urgency)),
    representativeQuotes: signals.slice(0, 3).map((signal) => signal.quote),
    relatedTools: unique(signals.flatMap((signal) => signal.toolsMentioned)).slice(
      0,
      8
    ),
    signalIds: signals.map((signal) => signal.id),
    sourceDiversity,
    averagePainIntensity: roundScore(averagePainIntensity),
    averageHyperbrowserFit: roundScore(averageHyperbrowserFit),
    clusterStrength: roundScore(clamp01(clusterStrength)),
    confidence: roundScore(confidence),
  };
}

function summarizeCluster(category: string, signals: PainSignal[]): string {
  const label = categoryLabels[category as keyof typeof categoryLabels] ?? category;
  const sources = unique(signals.map((signal) => signal.source)).join(", ");

  return `${label} appears across ${signals.length} signal${
    signals.length === 1 ? "" : "s"
  } from ${sources}, suggesting a recurring developer workflow constraint rather than a one-off complaint.`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function maxUrgency(values: Urgency[]): Urgency {
  if (values.includes("high")) return "high";
  if (values.includes("medium")) return "medium";
  return "low";
}
