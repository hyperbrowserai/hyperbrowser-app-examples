import type { PainSignal, SignalScore } from "../types";

const highScoreThreshold = 0.65;
const borderlineScoreMin = 0.38;
const borderlineScoreMax = 0.65;

export function selectJudgmentBatch(
  signals: PainSignal[],
  scores: SignalScore[]
): PainSignal[] {
  const scoreById = new Map(scores.map((score) => [score.signalId, score]));
  const byScore = [...signals].sort((a, b) => {
    const aScore = scoreById.get(a.id)?.total ?? 0;
    const bScore = scoreById.get(b.id)?.total ?? 0;
    return bScore - aScore;
  });
  const high = byScore
    .filter((signal) => (scoreById.get(signal.id)?.total ?? 0) >= highScoreThreshold)
    .slice(0, 12);
  const borderline = byScore
    .filter((signal) => {
      const total = scoreById.get(signal.id)?.total ?? 0;
      return total >= borderlineScoreMin && total < borderlineScoreMax;
    })
    .slice(0, 6);
  const selectedIds = new Set([...high, ...borderline].map((signal) => signal.id));
  const selectedSources = new Set(
    [...high, ...borderline].map((signal) => signal.source)
  );
  const diversityFillers = byScore
    .filter((signal) => !selectedIds.has(signal.id))
    .filter((signal) => !selectedSources.has(signal.source))
    .filter((signal, index, all) => {
      return all.findIndex((candidate) => candidate.source === signal.source) === index;
    })
    .slice(0, 2);

  return [...high, ...borderline, ...diversityFillers].slice(0, 20);
}
