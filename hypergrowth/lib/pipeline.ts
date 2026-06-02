import { buildGrowthBrief } from "./brief";
import { clusterSignals } from "./clustering";
import { dedupeSignals } from "./dedupe";
import { buildGrowthPlays } from "./growth-plays";
import { scoreSignals } from "./scoring";
import { synthesizeSignals } from "./synthesis";
import type { MinePipelineResult, PainSignal } from "./types";

export async function runSignalPipeline(
  query: string,
  signals: PainSignal[]
): Promise<MinePipelineResult> {
  const initialScores = scoreSignals(query, signals);
  const deduped = dedupeSignals(signals, initialScores);
  const dedupedScores = scoreSignals(query, deduped.signals);
  const clusters = clusterSignals(deduped.signals, dedupedScores);
  const candidatePlays = buildGrowthPlays(clusters, deduped.signals, dedupedScores);
  const synthesis = await synthesizeSignals({
    query,
    signals: deduped.signals,
    signalScores: dedupedScores,
    clusters,
    candidatePlays,
  });
  const growthPlays = synthesis.growthPlays.length
    ? synthesis.growthPlays
    : candidatePlays;
  const brief = buildGrowthBrief({
    query,
    clusters: synthesis.clusters.length ? synthesis.clusters : clusters,
    growthPlays,
    signals: deduped.signals,
  });

  return {
    signals: deduped.signals,
    signalScores: dedupedScores,
    dedupeGroups: deduped.groups,
    clusters: synthesis.clusters.length ? synthesis.clusters : clusters,
    growthPlays,
    outboundDrafts: synthesis.outboundDrafts,
    contentAngles: synthesis.contentAngles,
    brief,
  };
}
