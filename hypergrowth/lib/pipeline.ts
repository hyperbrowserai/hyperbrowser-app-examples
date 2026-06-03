import { buildGrowthBrief } from "./brief";
import { clusterSignals } from "./clustering";
import { dedupeSignals } from "./dedupe";
import { buildGrowthPlays } from "./growth-plays";
import { selectJudgmentBatch } from "./llm/batch-policy";
import { judgeSignals } from "./llm/judgment";
import { fuseLLMJudgments } from "./score-fusion";
import { scoreSignals } from "./scoring";
import { synthesizeSignals } from "./synthesis";
import type {
  AnalysisMode,
  LLMUsageMetadata,
  MinePipelineResult,
  PainSignal,
} from "./types";

export async function runSignalPipeline(
  query: string,
  signals: PainSignal[],
  options: {
    effectiveAnalysisMode: AnalysisMode;
    allowJudgment: boolean;
    allowSynthesis: boolean;
    llm: LLMUsageMetadata;
  }
): Promise<MinePipelineResult> {
  const initialScores = scoreSignals(query, signals);
  const deduped = dedupeSignals(signals, initialScores);
  const dedupedScores = scoreSignals(query, deduped.signals);
  const judgmentBatch = options.allowJudgment
    ? selectJudgmentBatch(deduped.signals, dedupedScores)
    : [];
  const judgment = options.allowJudgment
    ? await judgeSignals({
        query,
        signals: judgmentBatch,
        signalScores: dedupedScores.filter((score) =>
          judgmentBatch.some((signal) => signal.id === score.signalId)
        ),
      })
    : {
        judgments: [],
        callsAttempted: 0,
        mode: "disabled" as const,
      };
  const fused = fuseLLMJudgments({
    signals: deduped.signals,
    scores: dedupedScores,
    judgments: judgment.judgments,
  });
  const clusters = clusterSignals(fused.signals, fused.scores);
  const candidatePlays = buildGrowthPlays(clusters, fused.signals, fused.scores);
  const synthesis = await synthesizeSignals({
    query,
    signals: fused.signals,
    signalScores: fused.scores,
    clusters,
    candidatePlays,
  }, { allowLLM: options.allowSynthesis });
  const growthPlays = synthesis.growthPlays.length
    ? synthesis.growthPlays
    : candidatePlays;
  const brief = buildGrowthBrief({
    query,
    analysisMode: options.effectiveAnalysisMode,
    clusters: synthesis.clusters.length ? synthesis.clusters : clusters,
    growthPlays,
    signals: fused.signals,
  });
  const failureReason = [judgment.failureReason, synthesis.failureReason]
    .filter(Boolean)
    .join(" | ");
  const llm: LLMUsageMetadata = {
    ...options.llm,
    judgmentMode: judgment.mode,
    synthesisMode: synthesis.mode,
    callsAttempted:
      options.llm.callsAttempted +
      judgment.callsAttempted +
      synthesis.callsAttempted,
    failureReason: failureReason || options.llm.failureReason,
  };

  return {
    signals: fused.signals,
    signalScores: fused.scores,
    dedupeGroups: deduped.groups,
    llmJudgments: judgment.judgments,
    clusters: synthesis.clusters.length ? synthesis.clusters : clusters,
    growthPlays,
    outboundDrafts: synthesis.outboundDrafts,
    contentAngles: synthesis.contentAngles,
    brief,
    llm,
  };
}
