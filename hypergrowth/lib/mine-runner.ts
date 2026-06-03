import { resolveAnalysisMode } from "./analysis-mode";
import { buildDemoResult } from "./demo-data";
import { getHyperbrowserClient } from "./hyperbrowser";
import { resolveLLMProvider } from "./llm/provider";
import { normalizeSignals } from "./normalize";
import { runSignalPipeline } from "./pipeline";
import { runAutonomousResearch } from "./research/controller";
import { mineRequestSchema } from "./schema";
import {
  runEventLimits,
  truncateRunEventText,
  type EmitRunEvent,
} from "./run-events";
import type {
  EvidenceCandidate,
  ExecutedSearch,
  LLMUsageMetadata,
  MineResult,
  PainSignal,
  RawSignal,
  PhaseTiming,
  QueryPlan,
  SearchDiagnostic,
  SignalSource,
  SourceDebugSummary,
} from "./types";
import type { ResearchPlan } from "./research/types";

type ExecuteMineRunResult =
  | { ok: true; result: MineResult }
  | { ok: false; status: number; error: string };

export async function executeMineRun(
  body: unknown,
  options: { emit?: EmitRunEvent } = {}
): Promise<ExecuteMineRunResult> {
  const timings: PhaseTiming[] = [];
  const totalStartedAt = Date.now();
  const parsed = mineRequestSchema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: parsed.error.issues[0]?.message ?? "Invalid request.",
    };
  }

  const emit = async (event: Parameters<EmitRunEvent>[0]) => {
    await options.emit?.(event);
  };

  const { query, sources, maxResults, analysisMode, openWebTargets } =
    parsed.data;
  await emit({ type: "run_started", query, analysisMode, sources });

  const provider = resolveLLMProvider();

  if (!process.env.HYPERBROWSER_API_KEY) {
    const mode = resolveAnalysisMode({
      requested: analysisMode,
      provider,
      isDemo: true,
    });
    const result = buildDemoResult(query, analysisMode, mode);
    await emit({ type: "run_completed", result });
    return { ok: true, result };
  }

  const mode = resolveAnalysisMode({
    requested: analysisMode,
    provider,
  });
  const client = getHyperbrowserClient();
  const errors: string[] = [];

  await emit({
    type: "phase_started",
    phase: "planning",
    label: "Planning autonomous research",
  });

  const llmMetadata: LLMUsageMetadata = {
    provider: provider.provider,
    model: provider.model,
    queryExpansionMode: "disabled",
    judgmentMode: "disabled",
    synthesisMode: "disabled",
    callsAttempted: 0,
  };

  await emit({
    type: "phase_started",
    phase: "source_collection",
    label: "Running autonomous research",
  });
  const research = await measurePhase(timings, "sourceCollection", () =>
    runAutonomousResearch({
      client,
      query,
      sources,
      openWebTargets,
      maxResults,
      allowLLM: mode.allowedCalls >= 1,
      llmCallBudget: mode.allowedCalls,
      emit,
    })
  );
  const candidates = research.candidates;
  const quality = {
    accepted: research.qualityAccepted,
    rejected: research.qualityRejected,
  };
  const evidence = {
    rawSignals: research.rawSignals,
    rejectedCandidates: research.rejectedCandidates,
    llm: research.llm,
  };
  const rawSignals = evidence.rawSignals;
  const executedSearches = research.executedSearches;
  const searchDiagnostics = research.searchDiagnostics;
  const queryPlanResult = {
    plan: researchPlanToQueryPlan(query, sources, research.diagnostics.plan),
  };

  llmMetadata.queryExpansionMode = research.llm.queryExpansionMode;
  llmMetadata.candidateTriageMode = research.llm.candidateTriageMode;
  llmMetadata.evidenceExtractionMode = research.llm.evidenceExtractionMode;
  llmMetadata.gapExpansionMode = research.llm.gapExpansionMode;
  llmMetadata.callsAttempted += research.llm.callsAttempted;
  llmMetadata.failureReason = joinFailureReasons(
    llmMetadata.failureReason,
    research.llm.failureReason
  );
  await emitRejectedCandidates(quality.rejected, emit);
  await emit({
    type: "llm_step",
    step: "evidence_extraction",
    mode: evidence.llm.evidenceExtractionMode ?? "disabled",
    summary: `Accepted ${rawSignals.length} quote-first evidence items after post-fetch judgment.`,
  });
  for (const signal of rawSignals.slice(0, runEventLimits.acceptedEvidence)) {
    await emit({
      type: "evidence_accepted",
      source: signal.source,
      title: truncateRunEventText(signal.title, 120),
      quote: truncateRunEventText(signal.quote),
    });
  }

  const cappedRawSignals = rawSignals.slice(
    0,
    maxResults
  );

  if (rawSignals.length === 0) {
    const sourceDebug = buildSourceDebug({
      sources,
      candidates,
      qualityAccepted: quality.accepted,
      qualityRejected: quality.rejected,
      rawSignals,
      finalSignals: [],
    });
    const result = buildEmptyLiveResult({
      query,
      sources,
      errors,
      notes: [
        `Rejected ${quality.rejected.length + evidence.rejectedCandidates} low-quality candidates before scoring.`,
        "No public evidence was extracted for this query.",
      ],
      mode,
      llm: llmMetadata,
      queryPlan: queryPlanResult.plan,
      executedSearches,
      searchDiagnostics,
      sourceDebug,
      timings: finishTimings(timings, totalStartedAt),
    });
    await emit({ type: "run_completed", result });
    return { ok: true, result };
  }

  await emit({
    type: "phase_started",
    phase: "normalization",
    label: "Normalizing evidence",
  });
  const normalizedSignals = measureSyncPhase(timings, "normalization", () =>
    normalizeSignals(cappedRawSignals, query).slice(0, maxResults)
  );

  if (normalizedSignals.length === 0) {
    const sourceDebug = buildSourceDebug({
      sources,
      candidates,
      qualityAccepted: quality.accepted,
      qualityRejected: quality.rejected,
      rawSignals,
      finalSignals: normalizedSignals,
    });
    const result = buildEmptyLiveResult({
      query,
      sources,
      errors,
      notes: [
        "Live sources were fetched but did not produce enough normalized evidence.",
      ],
      mode,
      llm: llmMetadata,
      queryPlan: queryPlanResult.plan,
      executedSearches,
      searchDiagnostics,
      sourceDebug,
      timings: finishTimings(timings, totalStartedAt),
    });
    await emit({ type: "run_completed", result });
    return { ok: true, result };
  }

  await emit({
    type: "phase_started",
    phase: "pipeline",
    label: "Clustering signals",
  });
  const pipeline = await measurePhase(timings, "pipeline", () =>
    runSignalPipeline(query, normalizedSignals, {
      effectiveAnalysisMode: mode.effectiveAnalysisMode,
      allowJudgment: mode.allowedCalls >= 2,
      allowSynthesis: mode.allowedCalls >= 3,
      llm: llmMetadata,
    })
  );
  await emit({
    type: "llm_step",
    step: "judgment",
    mode: pipeline.llm.judgmentMode,
    summary: `Judged ${pipeline.llmJudgments.length} signals for actionability.`,
  });
  await emit({
    type: "llm_step",
    step: "synthesis",
    mode: pipeline.llm.synthesisMode,
    summary: `Prepared ${pipeline.growthPlays.length} growth plays.`,
  });
  for (const cluster of pipeline.clusters.slice(0, runEventLimits.clusters)) {
    await emit({
      type: "cluster_created",
      title: truncateRunEventText(cluster.title, 120),
      signalCount: cluster.signalIds.length,
    });
  }
  for (const play of pipeline.growthPlays.slice(0, runEventLimits.growthPlays)) {
    await emit({
      type: "play_created",
      title: truncateRunEventText(play.title, 120),
      channel: play.channel,
    });
  }

  const result: MineResult = {
    query,
    generatedAt: new Date().toISOString(),
    mode: "live",
    signals: pipeline.signals,
    clusters: pipeline.clusters,
    growthPlays: pipeline.growthPlays,
    outboundDrafts: pipeline.outboundDrafts,
    contentAngles: pipeline.contentAngles,
    signalScores: pipeline.signalScores,
    dedupeGroups: pipeline.dedupeGroups,
    llmJudgments: pipeline.llmJudgments,
    brief: pipeline.brief,
      metadata: {
        searchedSources: sources,
        errors,
        notes: buildRunNotes({
          downgradeReason: mode.downgradeReason,
          rejectedCandidates:
            quality.rejected.length + evidence.rejectedCandidates,
        gapSearch: undefined,
        openWebTargets,
      }),
      requestedAnalysisMode: mode.requestedAnalysisMode,
      effectiveAnalysisMode: mode.effectiveAnalysisMode,
      analysisMode: mode.analysisMode,
      downgradeReason: mode.downgradeReason,
      queryPlan: queryPlanResult.plan,
      executedSearches,
      searchDiagnostics,
      sourceDebug: buildSourceDebug({
        sources,
        candidates,
        qualityAccepted: quality.accepted,
        qualityRejected: quality.rejected,
        rawSignals,
        finalSignals: pipeline.signals,
      }),
      timings: finishTimings(timings, totalStartedAt),
      llm: pipeline.llm,
    },
  };

  await emit({ type: "phase_started", phase: "complete", label: "Complete" });
  await emit({ type: "run_completed", result });
  return { ok: true, result };
}

async function measurePhase<T>(
  timings: PhaseTiming[],
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();

  try {
    return await operation();
  } finally {
    timings.push({ name, durationMs: Date.now() - startedAt });
  }
}

function measureSyncPhase<T>(
  timings: PhaseTiming[],
  name: string,
  operation: () => T
): T {
  const startedAt = Date.now();

  try {
    return operation();
  } finally {
    timings.push({ name, durationMs: Date.now() - startedAt });
  }
}

function finishTimings(
  timings: PhaseTiming[],
  totalStartedAt: number
): PhaseTiming[] {
  return [...timings, { name: "total", durationMs: Date.now() - totalStartedAt }];
}

async function emitRejectedCandidates(
  candidates: EvidenceCandidate[],
  emit: EmitRunEvent
) {
  for (const candidate of candidates.slice(0, runEventLimits.rejectedCandidates)) {
    await emit({
      type: "candidate_rejected",
      source: candidate.source,
      title: truncateRunEventText(candidate.title, 120),
      flags: candidate.qualityFlags,
    });
  }
}

function joinFailureReasons(...reasons: Array<string | undefined>): string | undefined {
  const joined = reasons.filter(Boolean).join(" | ");
  return joined || undefined;
}

function researchPlanToQueryPlan(
  query: string,
  sources: SignalSource[],
  plan: ResearchPlan
): QueryPlan {
  const sourceQueries: QueryPlan["sourceQueries"] = {
    github: [],
    hackernews: [],
    reddit: [],
    hyperbrowser: [],
  };

  for (const wave of plan.waves) {
    for (const search of wave.searches) {
      sourceQueries[search.source].push(search.query);
    }
  }

  for (const source of sources) {
    sourceQueries[source] = Array.from(new Set(sourceQueries[source])).slice(0, 4);
  }

  return {
    originalQuery: query,
    strategy:
      plan.strategy === "llm-autonomous"
        ? "llm-source-routed"
        : "static-source-routed",
    sourceQueries,
    rationale: [
      ...plan.rationale,
      `Autonomous research stop condition: ${
        plan.waves.at(-1)?.reason ?? "source-specific discovery"
      }.`,
    ].slice(0, 5),
  };
}

function buildRunNotes({
  downgradeReason,
  rejectedCandidates,
  gapSearch,
  openWebTargets,
}: {
  downgradeReason?: string;
  rejectedCandidates: number;
  gapSearch?: ExecutedSearch;
  openWebTargets: {
    includeBroadWeb: boolean;
    redditSubreddits: string[];
  };
}): string[] {
  return [
    downgradeReason,
    openWebTargets.redditSubreddits.length > 0
      ? `Reddit is searched through Hyperbrowser open-web queries for: ${openWebTargets.redditSubreddits.join(", ")}.`
      : undefined,
    rejectedCandidates > 0
      ? `Rejected ${rejectedCandidates} low-quality candidates before scoring.`
      : undefined,
    gapSearch
      ? `LLM gap expansion added one ${gapSearch.source} search: "${gapSearch.query}".`
      : undefined,
  ].filter((note): note is string => Boolean(note));
}

function buildSourceDebug({
  sources,
  candidates,
  qualityAccepted,
  qualityRejected,
  rawSignals,
  finalSignals,
}: {
  sources: SignalSource[];
  candidates: EvidenceCandidate[];
  qualityAccepted: EvidenceCandidate[];
  qualityRejected: EvidenceCandidate[];
  rawSignals: RawSignal[];
  finalSignals: PainSignal[];
}): SourceDebugSummary[] {
  return sources.map((source) => {
    const rejectedForSource = qualityRejected.filter(
      (candidate) => candidate.source === source
    );
    const rejectionFlags: SourceDebugSummary["rejectionFlags"] = {};

    for (const candidate of rejectedForSource) {
      for (const flag of candidate.qualityFlags) {
        rejectionFlags[flag] = (rejectionFlags[flag] ?? 0) + 1;
      }
    }

    return {
      source,
      rawCandidates: candidates.filter((candidate) => candidate.source === source)
        .length,
      qualityAccepted: qualityAccepted.filter(
        (candidate) => candidate.source === source
      ).length,
      qualityRejected: rejectedForSource.length,
      evidenceAccepted: rawSignals.filter((signal) => signal.source === source)
        .length,
      finalSignals: finalSignals.filter((signal) => signal.source === source)
        .length,
      rejectionFlags,
      sampleAcceptedTitles: qualityAccepted
        .filter((candidate) => candidate.source === source)
        .slice(0, 3)
        .map((candidate) => truncateRunEventText(candidate.title, 90)),
      sampleRejected: rejectedForSource.slice(0, 3).map((candidate) => ({
        title: truncateRunEventText(candidate.title, 90),
        flags: candidate.qualityFlags,
      })),
    };
  });
}

function buildEmptyLiveResult({
  query,
  sources,
  errors,
  notes,
  mode,
  llm,
  queryPlan,
  executedSearches,
  searchDiagnostics,
  sourceDebug,
  timings,
}: {
  query: string;
  sources: SignalSource[];
  errors: string[];
  notes: string[];
  mode: ReturnType<typeof resolveAnalysisMode>;
  llm: LLMUsageMetadata;
  queryPlan: MineResult["metadata"]["queryPlan"];
  executedSearches: MineResult["metadata"]["executedSearches"];
  searchDiagnostics: SearchDiagnostic[];
  sourceDebug: SourceDebugSummary[];
  timings: PhaseTiming[];
}): MineResult {
  const generatedAt = new Date().toISOString();
  const emptySignals: PainSignal[] = [];

  return {
    query,
    generatedAt,
    mode: "live",
    signals: emptySignals,
    clusters: [],
    growthPlays: [],
    outboundDrafts: [],
    contentAngles: [],
    signalScores: [],
    dedupeGroups: [],
    llmJudgments: [],
    brief: {
      query,
      generatedAt,
      analysisMode: mode.effectiveAnalysisMode,
      confidence: "low",
      topFinding: "No public evidence was found for this query.",
      executiveSummary:
        "HyperGrowth did not find enough public evidence to recommend a growth play.",
      recommendedNextStep:
        "Try a narrower browser automation query or enable more public sources.",
      sourceMix: [],
      topClusters: [],
      recommendedPlays: [],
      evidence: [],
      caveats: [
        "Empty live results are returned honestly instead of substituting demo evidence.",
      ],
    },
    metadata: {
      searchedSources: sources,
      errors,
      notes,
      requestedAnalysisMode: mode.requestedAnalysisMode,
      effectiveAnalysisMode: mode.effectiveAnalysisMode,
      analysisMode: mode.analysisMode,
      downgradeReason: mode.downgradeReason,
      queryPlan,
      executedSearches,
      searchDiagnostics,
      sourceDebug,
      timings,
      llm,
    },
  };
}
