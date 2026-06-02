import { jaccardSimilarity } from "./text";
import type { DedupeGroup, PainSignal, SignalScore } from "./types";

const defaultThreshold = 0.82;

export function dedupeSignals(
  signals: PainSignal[],
  scores: SignalScore[],
  threshold = defaultThreshold
): { signals: PainSignal[]; groups: DedupeGroup[] } {
  const sorted = [...signals].sort(
    (a, b) => scoreFor(scores, b.id) - scoreFor(scores, a.id)
  );
  const kept: PainSignal[] = [];
  const groupMap = new Map<string, string[]>();

  for (const signal of sorted) {
    const duplicateOf = kept.find((candidate) => {
      const similarity = jaccardSimilarity(
        `${candidate.title} ${candidate.quote}`,
        `${signal.title} ${signal.quote}`
      );
      return similarity >= threshold;
    });

    if (!duplicateOf) {
      kept.push(signal);
      continue;
    }

    const existing = groupMap.get(duplicateOf.id) ?? [];
    existing.push(signal.id);
    groupMap.set(duplicateOf.id, existing);
  }

  const groups: DedupeGroup[] = Array.from(groupMap.entries()).map(
    ([canonicalSignalId, duplicateSignalIds], index) => ({
      id: `dedupe-${index + 1}`,
      canonicalSignalId,
      duplicateSignalIds,
      compressionRatio:
        (duplicateSignalIds.length + 1) / Math.max(1, duplicateSignalIds.length),
      similarityThreshold: threshold,
    })
  );

  return { signals: kept, groups };
}

function scoreFor(scores: SignalScore[], signalId: string): number {
  return scores.find((score) => score.signalId === signalId)?.total ?? 0;
}
