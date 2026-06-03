import { NextResponse } from "next/server";
import { resolveAnalysisMode } from "@/lib/analysis-mode";
import { buildDemoResult } from "@/lib/demo-data";
import { applyEvidenceQualityGate } from "@/lib/evidence-quality";
import { prepareEvidence } from "@/lib/evidence-pipeline";
import { getHyperbrowserClient } from "@/lib/hyperbrowser";
import { formatHyperbrowserError } from "@/lib/hyperbrowser-errors";
import { planSearchGap } from "@/lib/llm/search-gap";
import { resolveLLMProvider } from "@/lib/llm/provider";
import { normalizeSignals } from "@/lib/normalize";
import { runSignalPipeline } from "@/lib/pipeline";
import { buildQueryPlan } from "@/lib/query-planning";
import { mineRequestSchema } from "@/lib/schema";
import {
  defaultSourceBudgetPolicy,
  planExecutedSearches,
  withTimeout,
} from "@/lib/source-budget";
import { collectSourceCandidates } from "@/lib/sources";
import type {
  EvidenceCandidate,
  ExecutedSearch,
  LLMUsageMetadata,
  MineResult,
  PainSignal,
  PhaseTiming,
  SearchDiagnostic,
  SignalSource,
  SourceBudgetPolicy,
} from "@/lib/types";

export async function POST(request: Request) {
  const timings: PhaseTiming[] = [];
  const totalStartedAt = Date.now();
  const body = await request.json().catch(() => null);
  const parsed = mineRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const { query, sources, maxResults, analysisMode, openWebTargets } = parsed.data;
  const provider = resolveLLMProvider();

  if (!process.env.HYPERBROWSER_API_KEY) {
    const mode = resolveAnalysisMode({
      requested: analysisMode,
      provider,
      isDemo: true,
    });
    return NextResponse.json(buildDemoResult(query, analysisMode, mode));
  }

  const mode = resolveAnalysisMode({
    requested: analysisMode,
    provider,
  });
  const client = getHyperbrowserClient();
  const errors: string[] = [];
  const queryPlanResult = await measurePhase(timings, "queryPlanning", () =>
    buildQueryPlan({
      query,
      selectedSources: sources,
      allowLLM: mode.allowedCalls >= 1,
      openWebTargets,
    })
  );
  const sourceBudget = buildRequestSourceBudget(maxResults, sources);
  const executedSearches = planExecutedSearches({
    queryPlan: queryPlanResult.plan,
    selectedSources: sources,
    policy: sourceBudget,
  });
  const llmMetadata: LLMUsageMetadata = {
    provider: provider.provider,
    model: provider.model,
    queryExpansionMode:
      queryPlanResult.callsAttempted === 0
        ? "disabled"
        : queryPlanResult.failureReason
          ? "fallback"
          : "used",
    judgmentMode: "disabled",
    synthesisMode: "disabled",
    callsAttempted: queryPlanResult.callsAttempted,
    failureReason: queryPlanResult.failureReason,
  };

  const sourceCollection = await measurePhase(timings, "sourceCollection", () =>
    executeSearchesSequentially({
      client,
      searches: executedSearches,
      sourceBudget,
      errors,
    })
  );
  let { candidates, searchDiagnostics } = sourceCollection;
  const initialQuality = applyEvidenceQualityGate(candidates, query);
  const gap = await measurePhase(timings, "searchGap", () =>
    planSearchGap({
      query,
      selectedSources: sources,
      candidates: initialQuality.accepted,
      allowLLM: mode.allowedCalls >= 3,
    })
  );

  llmMetadata.gapExpansionMode = gap.mode;
  llmMetadata.callsAttempted += gap.callsAttempted;
  llmMetadata.failureReason = joinFailureReasons(
    llmMetadata.failureReason,
    gap.failureReason
  );

  if (gap.search) {
    const gapSearch = gap.search;
    const gapCollection = await measurePhase(timings, "gapSourceCollection", () =>
      executeSearchesSequentially({
        client,
        searches: [gapSearch],
        sourceBudget,
        errors,
      })
    );
    candidates = [...candidates, ...gapCollection.candidates];
    searchDiagnostics = [
      ...searchDiagnostics,
      ...gapCollection.searchDiagnostics,
    ];
  }

  const quality = applyEvidenceQualityGate(candidates, query);
  const evidence = await measurePhase(timings, "evidencePreparation", () =>
    prepareEvidence({
      client,
      query,
      candidates: quality.accepted,
      maxResults: Math.min(maxResults, sourceBudget.maxRawSignalsTotal),
      allowTriage: mode.allowedCalls >= 2,
      allowExtraction: mode.allowedCalls >= 3,
    })
  );
  const rawSignals = evidence.rawSignals;

  llmMetadata.candidateTriageMode = evidence.llm.candidateTriageMode;
  llmMetadata.evidenceExtractionMode = evidence.llm.evidenceExtractionMode;
  llmMetadata.callsAttempted += evidence.llm.callsAttempted;
  llmMetadata.failureReason = joinFailureReasons(
    llmMetadata.failureReason,
    evidence.llm.failureReason
  );

  const cappedRawSignals = rawSignals.slice(
    0,
    Math.min(maxResults, sourceBudget.maxRawSignalsTotal)
  );

  if (rawSignals.length === 0) {
    return NextResponse.json(
      buildEmptyLiveResult({
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
        timings: finishTimings(timings, totalStartedAt),
      })
    );
  }

  const normalizedSignals = measureSyncPhase(timings, "normalization", () =>
    normalizeSignals(cappedRawSignals, query).slice(0, maxResults)
  );

  if (normalizedSignals.length === 0) {
    return NextResponse.json(
      buildEmptyLiveResult({
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
        timings: finishTimings(timings, totalStartedAt),
      })
    );
  }

  const pipeline = await measurePhase(timings, "pipeline", () =>
    runSignalPipeline(query, normalizedSignals, {
      effectiveAnalysisMode: mode.effectiveAnalysisMode,
      allowJudgment: mode.allowedCalls >= 2,
      allowSynthesis: mode.allowedCalls >= 3,
      llm: llmMetadata,
    })
  );
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
        gapSearch: gap.search,
        openWebTargets,
      }),
      requestedAnalysisMode: mode.requestedAnalysisMode,
      effectiveAnalysisMode: mode.effectiveAnalysisMode,
      analysisMode: mode.analysisMode,
      downgradeReason: mode.downgradeReason,
      queryPlan: queryPlanResult.plan,
      executedSearches,
      searchDiagnostics,
      timings: finishTimings(timings, totalStartedAt),
      llm: pipeline.llm,
    },
  };

  return NextResponse.json(result);
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

function buildRequestSourceBudget(
  maxResults: number,
  sources: SignalSource[]
): SourceBudgetPolicy {
  const sourceCount = sources.length;
  const hyperbrowserExpansionBudget = sources.includes("hyperbrowser") ? 3 : 0;

  return {
    ...defaultSourceBudgetPolicy,
    maxSourceSearchesPerRun: Math.min(
      defaultSourceBudgetPolicy.maxSourceSearchesPerRun,
      Math.max(sourceCount + hyperbrowserExpansionBudget, Math.ceil(maxResults / 2))
    ),
    maxRawSignalsPerSearch: Math.min(
      defaultSourceBudgetPolicy.maxRawSignalsPerSearch,
      Math.max(3, Math.ceil(maxResults / Math.max(1, sourceCount)))
    ),
    maxRawSignalsTotal: Math.min(
      defaultSourceBudgetPolicy.maxRawSignalsTotal,
      Math.max(maxResults, sourceCount * 3)
    ),
  };
}

async function executeSearchesSequentially({
  client,
  searches,
  sourceBudget,
  errors,
}: {
  client: ReturnType<typeof getHyperbrowserClient>;
  searches: ExecutedSearch[];
  sourceBudget: SourceBudgetPolicy;
  errors: string[];
}): Promise<{ candidates: EvidenceCandidate[]; searchDiagnostics: SearchDiagnostic[] }> {
  const candidates: EvidenceCandidate[] = [];
  const searchDiagnostics: SearchDiagnostic[] = [];

  for (const search of searches) {
    const startedAt = Date.now();

    try {
      const found = await withTimeout(
        collectSourceCandidates({
          client,
          source: search.source,
          query: search.query,
          maxResults: sourceBudget.maxRawSignalsPerSearch,
        }),
        sourceBudget.requestTimeoutMs,
        `${search.source}:${search.query}`
      );

      candidates.push(...found);
      searchDiagnostics.push({
        ...search,
        durationMs: Date.now() - startedAt,
        status: "success",
        rawSignals: found.length,
      });
    } catch (error) {
      const formatted = formatHyperbrowserError(error);
      addUniqueError(errors, formatted);
      searchDiagnostics.push({
        ...search,
        durationMs: Date.now() - startedAt,
        status: "error",
        rawSignals: 0,
        error: formatted,
      });
    }
  }

  return { candidates, searchDiagnostics };
}

function addUniqueError(errors: string[], error: string): void {
  if (!errors.includes(error)) {
    errors.push(error);
  }
}

function joinFailureReasons(...reasons: Array<string | undefined>): string | undefined {
  const joined = reasons.filter(Boolean).join(" | ");
  return joined || undefined;
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
      timings,
      llm,
    },
  };
}
