import type { Hyperbrowser } from "@hyperbrowser/sdk";
import { applyEvidenceQualityGate } from "../evidence-quality";
import { fetchPageArtifacts } from "../hyperbrowser";
import { formatHyperbrowserError } from "../hyperbrowser-errors";
import { truncateRunEventText, type EmitRunEvent } from "../run-events";
import { withTimeout } from "../source-budget";
import { collectSourceCandidates } from "../sources";
import type {
  EvidenceCandidate,
  OpenWebTargets,
  ExecutedSearch,
  SearchDiagnostic,
  SignalSource,
} from "../types";
import { selectFetchTargets } from "./critic";
import { judgeEvidence } from "./evidence-judge";
import { triageFetchedPages } from "./page-triage";
import { createGapExpansionSearches, createResearchPlan } from "./planner";
import type {
  FetchAdapter,
  FetchedDocument,
  PageTriageAdapter,
  PageTriageDecision,
  ResearchBudget,
  ResearchFeedback,
  ResearchSearch,
  ResearchResult,
  SearchAdapter,
} from "./types";

const defaultBudget: ResearchBudget = {
  maxWaves: 2,
  maxQueriesPerWave: 8,
  maxFetchesPerRun: 5,
  maxEnrichmentSearches: 6,
  requestTimeoutMs: 12_000,
};

export async function runAutonomousResearch({
  client,
  query,
  sources,
  openWebTargets,
  maxResults,
  allowLLM,
  llmCallBudget = allowLLM ? 3 : 0,
  emit,
  budget = defaultBudget,
  searchAdapter,
  fetchAdapter,
  pageTriageAdapter,
}: {
  client: Hyperbrowser;
  query: string;
  sources: SignalSource[];
  openWebTargets: OpenWebTargets;
  maxResults: number;
  allowLLM: boolean;
  llmCallBudget?: number;
  emit?: EmitRunEvent;
  budget?: Partial<ResearchBudget>;
  searchAdapter?: SearchAdapter;
  fetchAdapter?: FetchAdapter;
  pageTriageAdapter?: PageTriageAdapter;
}): Promise<ResearchResult> {
  const effectiveBudget = {
    ...defaultBudget,
    maxFetchesPerRun: Math.max(defaultBudget.maxFetchesPerRun, maxResults * 2),
    ...budget,
  };
  const effectiveSources = uniqueSources([...sources, "hyperbrowser"]);
  const llm: ResearchResult["llm"] = {
    queryExpansionMode: "disabled",
    candidateTriageMode: "disabled",
    pageTriageMode: "disabled",
    evidenceExtractionMode: "disabled",
    gapExpansionMode: "disabled",
    callsAttempted: 0,
  };
  const errors: string[] = [];
  const candidates: EvidenceCandidate[] = [];
  const searchDiagnostics: SearchDiagnostic[] = [];
  const fetchedDocuments: FetchedDocument[] = [];
  const pageTriageDecisions: ResearchResult["diagnostics"]["pageTriageDecisions"] =
    [];
  const feedback: ResearchFeedback[] = [];
  const candidateSearchContext = new Map<string, CandidateSearchContext>();
  const executedSearches: ExecutedSearch[] = [];
  let qualityAccepted: EvidenceCandidate[] = [];
  let qualityRejected: EvidenceCandidate[] = [];
  let rawSignals: ResearchResult["rawSignals"] = [];
  let judgments: ResearchResult["diagnostics"]["judgments"] = [];

  const planner = await createResearchPlan({
    query,
    selectedSources: effectiveSources,
    openWebTargets,
    remainingLLMCalls: allowLLM ? Math.max(0, llmCallBudget - llm.callsAttempted) : 0,
  });
  llm.queryExpansionMode = planner.mode;
  llm.callsAttempted += planner.callsAttempted;
  llm.failureReason = joinFailureReasons(llm.failureReason, planner.failureReason);
  await emit?.({
    type: "llm_step",
    step: "query_expansion",
    mode: planner.mode,
    summary:
      planner.mode === "used"
        ? "Autonomous planner generated source-specific searches."
        : "Used static autonomous search planning.",
  });

  let fetchesUsed = 0;
  let stopReason = "Completed initial autonomous research wave.";
  const waves = [...planner.plan.waves];
  let waveCursor = 0;

  while (waveCursor < Math.min(waves.length, effectiveBudget.maxWaves)) {
    const wave = waves[waveCursor];
    if (!wave) break;
    waveCursor += 1;
    const waveSearches = limitSearchesWithCoverage(
      wave.searches,
      effectiveSources,
      effectiveBudget.maxQueriesPerWave
    );
    const discoverySearches = ensureHyperbrowserDiscoverySearches(
      waveSearches,
      query
    );
    const plannedEnrichmentSearches = waveSearches.filter(
      (search) => search.source !== "hyperbrowser"
    );

    for (const search of discoverySearches) {
      const found = await executeResearchSearch({
        client,
        search,
        maxResults,
        requestTimeoutMs: effectiveBudget.requestTimeoutMs,
        searchAdapter,
        errors,
        emit,
      });
      recordCandidateSearchContext({
        candidates: found.candidates,
        search,
        waveIndex: wave.index,
        candidateSearchContext,
      });
      appendUniqueCandidates(candidates, found.candidates);
      searchDiagnostics.push(found.diagnostic);
      executedSearches.push({
        source: search.source,
        query: search.query,
        reason: search.reason,
      });
    }

    const initialQuality = applyEvidenceQualityGate(candidates, query);
    const remainingFetches = effectiveBudget.maxFetchesPerRun - fetchesUsed;
    const reserveGapExpansionCall =
      allowLLM && waveCursor < effectiveBudget.maxWaves ? 1 : 0;
    const reserveEvidenceCall = allowLLM ? 1 : 0;
    const allowCriticLLM =
      llm.callsAttempted + reserveGapExpansionCall + reserveEvidenceCall <
      llmCallBudget;
    const critic = await selectFetchTargets({
      query,
      candidates: initialQuality.accepted,
      maxTargets: Math.min(remainingFetches, maxResults),
      minTargets: Math.max(1, Math.floor(maxResults / 2)),
      remainingLLMCalls: allowCriticLLM ? Math.max(0, llmCallBudget - llm.callsAttempted - reserveGapExpansionCall - reserveEvidenceCall) : 0,
    });
    llm.candidateTriageMode = combineMode(llm.candidateTriageMode, critic.mode);
    llm.callsAttempted += critic.callsAttempted;
    llm.failureReason = joinFailureReasons(llm.failureReason, critic.failureReason);
    await emit?.({
      type: "llm_step",
      step: "candidate_triage",
      mode: critic.mode,
      summary: `Selected ${critic.targets.length} source pages for Hyperbrowser Fetch.`,
    });

    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const fetchedThisWave: FetchedDocument[] = [];
    for (const target of critic.targets) {
      if (fetchesUsed >= effectiveBudget.maxFetchesPerRun) break;
      const candidate = byId.get(target.candidateId);
      if (!candidate) continue;
      fetchesUsed += 1;

      const fetched = await (fetchAdapter ?? defaultFetchAdapter(client))(candidate);
      fetchedDocuments.push(fetched);
      fetchedThisWave.push(fetched);

      if (fetched.status === "success") {
        const index = candidates.findIndex((item) => item.id === candidate.id);
        const enriched = {
          ...candidate,
          discoveryMethod: "hyperbrowser-fetch" as const,
          body: fetched.markdown || candidate.body,
          snippet: candidate.snippet || bestSnippet(fetched.markdown),
        };
        if (index >= 0) candidates[index] = enriched;
      }
    }

    const allowPageTriageLLM =
      allowLLM &&
      fetchedThisWave.some((document) => document.status === "success") &&
      llm.callsAttempted < llmCallBudget;
    const pageTriage = await (pageTriageAdapter ?? triageFetchedPages)({
      query,
      candidates,
      fetchedDocuments: fetchedThisWave,
      maxDecisions: Math.max(maxResults, fetchedThisWave.length),
      remainingLLMCalls: allowPageTriageLLM ? Math.max(0, llmCallBudget - llm.callsAttempted) : 0,
    });
    llm.pageTriageMode = combineMode(llm.pageTriageMode, pageTriage.mode);
    llm.callsAttempted += pageTriage.callsAttempted;
    llm.failureReason = joinFailureReasons(
      llm.failureReason,
      pageTriage.failureReason
    );
    pageTriageDecisions.push(...pageTriage.decisions);
    applyPageTriageToFetchedDocuments(fetchedDocuments, pageTriage.decisions);
    const waveFeedback = buildResearchFeedback({
      pageTriageDecisions: pageTriage.decisions,
      fetchedDocuments: fetchedThisWave,
      candidates,
      candidateSearchContext,
    });
    if (waveFeedback) {
      feedback.push(waveFeedback);
    }
    await emit?.({
      type: "llm_step",
      step: "page_triage",
      mode: pageTriage.mode,
      summary: `Triaged ${pageTriage.decisions.length} fetched pages with browser artifacts.`,
    });

    const enrichmentSearches = planEnrichmentSearches({
      query,
      selectedSources: effectiveSources,
      plannedSearches: plannedEnrichmentSearches,
      candidates,
      fetchedDocuments,
      maxSearches: effectiveBudget.maxEnrichmentSearches,
    });

    for (const search of enrichmentSearches) {
      const found = await executeResearchSearch({
        client,
        search,
        maxResults,
        requestTimeoutMs: effectiveBudget.requestTimeoutMs,
        searchAdapter,
        errors,
        emit,
      });
      recordCandidateSearchContext({
        candidates: found.candidates,
        search,
        waveIndex: wave.index,
        candidateSearchContext,
      });
      appendUniqueCandidates(candidates, found.candidates);
      searchDiagnostics.push(found.diagnostic);
      executedSearches.push({
        source: search.source,
        query: search.query,
        reason: search.reason,
      });
    }

    const judged = await judgeEvidence({
      query,
      candidates,
      pageTriageDecisions,
      maxResults,
      remainingLLMCalls: allowLLM ? Math.max(0, llmCallBudget - llm.callsAttempted) : 0,
    });
    llm.evidenceExtractionMode = combineMode(
      llm.evidenceExtractionMode,
      judged.mode
    );
    llm.callsAttempted += judged.callsAttempted;
    llm.failureReason = joinFailureReasons(llm.failureReason, judged.failureReason);
    qualityAccepted = judged.qualityAccepted;
    qualityRejected = judged.qualityRejected;
    rawSignals = judged.rawSignals;
    judgments = judged.judgments;

    for (const signal of judged.rawSignals.slice(0, 8)) {
      await emit?.({
        type: "evidence_accepted",
        source: signal.source,
        title: truncateRunEventText(signal.title, 120),
        quote: truncateRunEventText(signal.quote),
      });
    }

    const coverage = sourceCoverage(effectiveSources, executedSearches);
    const targetEvidence = maxResults;
    const enoughEvidence = judged.rawSignals.length >= targetEvidence;

    if (enoughEvidence && coverage.complete) {
      stopReason = `Stopped after wave ${wave.index}; evidence target and selected source coverage were satisfied.`;
      break;
    }

    if (waveCursor >= effectiveBudget.maxWaves) {
      stopReason = `Stopped after wave ${wave.index}; research wave budget was exhausted.`;
      break;
    }

    const gapExpansion = await createGapExpansionSearches({
      query,
      selectedSources: effectiveSources,
      openWebTargets,
      executedSearches: executedSearches.map((search) => ({
        ...search,
        rationale: "Previously executed search.",
      })),
      acceptedEvidence: judged.rawSignals.map((signal) => ({
        source: signal.source,
        title: signal.title,
        quote: signal.quote,
      })),
      rejectedCandidates: judged.qualityRejected.map((candidate) => ({
        source: candidate.source,
        title: candidate.title,
        flags: candidate.qualityFlags,
      })),
      researchFeedback: feedback,
      remainingLLMCalls: allowLLM ? Math.max(0, llmCallBudget - llm.callsAttempted) : 0,
    });
    llm.gapExpansionMode = combineMode(
      llm.gapExpansionMode,
      gapExpansion.mode
    );
    llm.callsAttempted += gapExpansion.callsAttempted;
    llm.failureReason = joinFailureReasons(
      llm.failureReason,
      gapExpansion.failureReason
    );
    await emit?.({
      type: "llm_step",
      step: "gap_expansion",
      mode: gapExpansion.mode,
      summary: gapExpansion.searches.length
        ? `Expanded into ${gapExpansion.searches.length} follow-up searches${
            feedback.length ? " using page-triage feedback" : ""
          }.`
        : `No useful follow-up searches were added${
            feedback.length ? " after page-triage feedback" : ""
          }.`,
    });

    if (gapExpansion.searches.length === 0) {
      stopReason = `Stopped after wave ${wave.index}; gap expansion found no new searches.`;
      break;
    }

    waves.push({
      index: wave.index + 1,
      searches: gapExpansion.searches,
      reason: "LLM gap expansion after judged evidence.",
    });
    stopReason = `Wave ${wave.index} expanded because evidence or source coverage was incomplete.`;
  }

  return {
    candidates,
    qualityAccepted,
    qualityRejected,
    rawSignals,
    executedSearches,
    searchDiagnostics,
    rejectedCandidates: qualityRejected.length,
    llm,
    diagnostics: {
      plan: { ...planner.plan, waves },
      searches: searchDiagnostics,
      fetchedDocuments,
      pageTriageDecisions,
      feedback,
      judgments,
      stopReason,
    },
  };
}

type CandidateSearchContext = {
  source: SignalSource;
  query: string;
  waveIndex: number;
  rationale: string;
};

function recordCandidateSearchContext({
  candidates,
  search,
  waveIndex,
  candidateSearchContext,
}: {
  candidates: EvidenceCandidate[];
  search: ResearchSearch;
  waveIndex: number;
  candidateSearchContext: Map<string, CandidateSearchContext>;
}): void {
  for (const candidate of candidates) {
    if (candidateSearchContext.has(candidate.id)) continue;
    candidateSearchContext.set(candidate.id, {
      source: search.source,
      query: search.query,
      waveIndex,
      rationale: search.rationale,
    });
  }
}

export function buildResearchFeedback({
  pageTriageDecisions,
  fetchedDocuments,
  candidates,
  candidateSearchContext,
}: {
  pageTriageDecisions: PageTriageDecision[];
  fetchedDocuments: FetchedDocument[];
  candidates: EvidenceCandidate[];
  candidateSearchContext: Map<string, CandidateSearchContext>;
}): ResearchFeedback | undefined {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const documentById = new Map(
    fetchedDocuments.map((document) => [document.candidateId, document])
  );
  const rejectedPages = pageTriageDecisions
    .filter((decision) => decision.decision !== "accept")
    .flatMap((decision) => {
      const candidate = candidateById.get(decision.candidateId);
      const document = documentById.get(decision.candidateId);
      if (!candidate || !document) return [];
      const searchContext = candidateSearchContext.get(decision.candidateId);
      const rejectionReason =
        normalizeFeedbackText(decision.rejectionReason) ||
        normalizeFeedbackText(decision.reasoning[0]) ||
        "Rejected by page triage.";

      return [
        {
          candidateId: decision.candidateId,
          source: candidate.source,
          title: candidate.title,
          url: document.url || candidate.canonicalUrl || candidate.sourceUrl,
          originalSearchQuery: searchContext?.query,
          rejectionReason,
          pageType: decision.pageType,
          confidence: decision.confidence,
          reasoning: normalizeFeedbackStrings(decision.reasoning).slice(0, 3),
          followUpSearches: normalizeFollowUpSearches(decision.followUpSearches),
          decision: decision.decision,
          hyperbrowserFit: decision.hyperbrowserFit,
        },
      ];
    });

  const suggestedSearches = normalizeFollowUpSearches(
    rejectedPages.flatMap((page) => page.followUpSearches)
  );

  if (!rejectedPages.length && !suggestedSearches.length) {
    return undefined;
  }

  return {
    summary: buildFeedbackSummary(rejectedPages),
    rejectedPages: rejectedPages.map((page) => ({
      candidateId: page.candidateId,
      source: page.source,
      title: page.title,
      url: page.url,
      originalSearchQuery: page.originalSearchQuery,
      rejectionReason: page.rejectionReason,
      pageType: page.pageType,
      confidence: page.confidence,
      reasoning: page.reasoning,
      followUpSearches: page.followUpSearches,
    })),
    suggestedSearches,
  };
}

function buildFeedbackSummary(
  rejectedPages: Array<{
    rejectionReason: string;
    pageType?: string;
    decision: PageTriageDecision["decision"];
    hyperbrowserFit: number;
  }>
): string[] {
  const summary: string[] = [];

  if (rejectedPages.length) {
    summary.push(`${rejectedPages.length} fetched pages need routing adjustment.`);
  }

  const commonPageType = mostCommon(
    rejectedPages
      .map((page) => normalizeFeedbackText(page.pageType))
      .filter(Boolean)
  );
  if (commonPageType) {
    summary.push(`Common rejected page type: ${commonPageType}.`);
  }

  const repeatedReason = mostCommon(
    rejectedPages.map((page) => page.rejectionReason).filter(Boolean)
  );
  if (repeatedReason) {
    summary.push(`Repeated rejection: ${repeatedReason}`);
  }

  const lowFitCount = rejectedPages.filter(
    (page) => page.hyperbrowserFit < 0.35
  ).length;
  if (lowFitCount) {
    summary.push(`${lowFitCount} pages had low Hyperbrowser fit.`);
  }

  const needsContextCount = rejectedPages.filter(
    (page) => page.decision === "needs_more_context"
  ).length;
  if (needsContextCount) {
    summary.push(`${needsContextCount} pages needed more context.`);
  }

  return summary.slice(0, 5);
}

function mostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].sort(
    ([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || leftValue.localeCompare(rightValue)
  )[0]?.[0];
}

function normalizeFeedbackStrings(values: unknown[]): string[] {
  return values
    .map(normalizeFeedbackText)
    .filter((value): value is string => Boolean(value));
}

function normalizeFollowUpSearches(values: unknown[]): string[] {
  const seen = new Set<string>();
  const searches: string[] = [];

  for (const value of normalizeFeedbackStrings(values)) {
    if (value.length < 3 || value.length > 96) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    searches.push(value);
  }

  return searches;
}

function normalizeFeedbackText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function defaultSearchAdapter(client: Hyperbrowser): SearchAdapter {
  return ({ source, query, maxResults }) =>
    collectSourceCandidates({ client, source, query, maxResults });
}

async function executeResearchSearch({
  client,
  search,
  maxResults,
  requestTimeoutMs,
  searchAdapter,
  errors,
  emit,
}: {
  client: Hyperbrowser;
  search: ResearchSearch;
  maxResults: number;
  requestTimeoutMs: number;
  searchAdapter?: SearchAdapter;
  errors: string[];
  emit?: EmitRunEvent;
}): Promise<{ candidates: EvidenceCandidate[]; diagnostic: SearchDiagnostic }> {
  await emit?.({
    type: "search_query",
    source: search.source,
    query: truncateRunEventText(search.query),
    reason: search.reason,
  });

  const startedAt = Date.now();

  try {
    const candidates = await withTimeout(
      (searchAdapter ?? defaultSearchAdapter(client))({
        source: search.source,
        query: search.query,
        maxResults: Math.max(5, Math.min(12, maxResults)),
      }),
      requestTimeoutMs,
      `${search.source}:${search.query}`
    );
    const durationMs = Date.now() - startedAt;
    const diagnostic: SearchDiagnostic = {
      source: search.source,
      query: search.query,
      reason: search.reason,
      durationMs,
      status: "success",
      rawSignals: candidates.length,
    };

    await emit?.({
      type: "source_result",
      source: search.source,
      query: truncateRunEventText(search.query),
      raw: candidates.length,
      durationMs,
      status: "success",
    });

    return { candidates, diagnostic };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const formatted = formatHyperbrowserError(error);
    addUnique(errors, formatted);
    const diagnostic: SearchDiagnostic = {
      source: search.source,
      query: search.query,
      reason: search.reason,
      durationMs,
      status: "error",
      rawSignals: 0,
      error: formatted,
    };

    await emit?.({
      type: "source_result",
      source: search.source,
      query: truncateRunEventText(search.query),
      raw: 0,
      durationMs,
      status: "error",
      error: truncateRunEventText(formatted),
    });

    return { candidates: [], diagnostic };
  }
}

function ensureHyperbrowserDiscoverySearches(
  searches: ResearchSearch[],
  query: string
): ResearchSearch[] {
  const discovery = searches.filter((search) => search.source === "hyperbrowser");

  if (discovery.length > 0) {
    return discovery;
  }

  return [
    {
      source: "hyperbrowser",
      query: `${query} workaround`,
      reason: "expanded",
      rationale: "Mandatory Hyperbrowser-first discovery fallback.",
    },
  ];
}

function planEnrichmentSearches({
  query,
  selectedSources,
  plannedSearches,
  candidates,
  fetchedDocuments,
  maxSearches,
}: {
  query: string;
  selectedSources: SignalSource[];
  plannedSearches: ResearchSearch[];
  candidates: EvidenceCandidate[];
  fetchedDocuments: FetchedDocument[];
  maxSearches: number;
}): ResearchSearch[] {
  const searches: ResearchSearch[] = [];
  const linkedTargets = extractLinkedEnrichmentSearches({
    query,
    selectedSources,
    candidates,
    fetchedDocuments,
  });

  for (const search of [...linkedTargets, ...plannedSearches]) {
    if (!selectedSources.includes(search.source)) continue;
    if (search.source === "hyperbrowser") continue;
    if (
      searches.some(
        (item) => item.source === search.source && item.query === search.query
      )
    ) {
      continue;
    }

    searches.push(search);
    if (searches.length >= maxSearches) break;
  }

  return searches;
}

function extractLinkedEnrichmentSearches({
  query,
  selectedSources,
  candidates,
  fetchedDocuments,
}: {
  query: string;
  selectedSources: SignalSource[];
  candidates: EvidenceCandidate[];
  fetchedDocuments: FetchedDocument[];
}): ResearchSearch[] {
  const haystack = [
    ...candidates
      .filter((candidate) => candidate.source === "hyperbrowser")
      .flatMap((candidate) => [
        candidate.title,
        candidate.snippet,
        candidate.body ?? "",
        candidate.canonicalUrl ?? "",
      ]),
    ...fetchedDocuments.flatMap((document) => [
      document.url,
      document.markdown,
      ...(document.links ?? []),
    ]),
  ].join("\n");
  const searches: ResearchSearch[] = [];
  const compactQuery = compactSearchQuery(query);

  if (selectedSources.includes("github")) {
    const repos = Array.from(
      haystack.matchAll(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/g)
    )
      .map((match) => match[1]?.replace(/\.git$/, ""))
      .filter((repo): repo is string => Boolean(repo))
      .slice(0, 2);

    for (const repo of repos) {
      searches.push({
        source: "github",
        query: `${compactQuery} repo:${repo} is:issue`,
        reason: "expanded",
        rationale: "GitHub API enrichment from a Hyperbrowser-discovered link.",
      });
    }

    searches.push({
      source: "github",
      query: `${compactQuery} is:issue`,
      reason: "expanded",
      rationale: "GitHub API corroboration after Hyperbrowser discovery.",
    });
  }

  if (selectedSources.includes("hackernews")) {
    searches.push({
      source: "hackernews",
      query: compactQuery,
      reason: "expanded",
      rationale: "Hacker News API corroboration after Hyperbrowser discovery.",
    });
  }

  return searches;
}

function defaultFetchAdapter(client: Hyperbrowser): FetchAdapter {
  return async (candidate) => {
    const url = candidate.canonicalUrl ?? candidate.sourceUrl;
    const stealth = isRedditUrl(url) ? "auto" : undefined;

    try {
      const artifacts = await fetchPageArtifacts(client, url, {
        stealth,
      });
      return {
        candidateId: candidate.id,
        url,
        markdown: artifacts.markdown,
        links: normalizeFetchedLinks(artifacts.links),
        outputFormats: artifacts.outputFormats,
        stealth,
        metadataTitle: readString(artifacts.metadata?.title),
        metadataDescription: readString(artifacts.metadata?.description),
        metadataSourceUrl: readString(artifacts.metadata?.sourceURL),
        screenshot: artifacts.screenshot
          ? {
              src: artifacts.screenshot,
              byteLength: estimateStringBytes(artifacts.screenshot),
            }
          : undefined,
        pageSummary: artifacts.json,
        branding: artifacts.branding,
        richFetchStatus: artifacts.richFetchStatus,
        richFetchError: artifacts.richFetchError,
        status: "success",
      };
    } catch (error) {
      return {
        candidateId: candidate.id,
        url,
        markdown: "",
        links: [],
        outputFormats: ["markdown", "links"],
        stealth,
        status: "error",
        error: formatHyperbrowserError(error),
      };
    }
  };
}

function normalizeFetchedLinks(links: unknown[]): string[] {
  return links
    .map((link) => {
      if (typeof link === "string") return link;
      if (typeof link !== "object" || link === null) return "";
      const record = link as Record<string, unknown>;
      return typeof record.url === "string"
        ? record.url
        : typeof record.href === "string"
          ? record.href
          : "";
    })
    .filter((link) => /^https?:\/\//i.test(link))
    .slice(0, 40);
}

function applyPageTriageToFetchedDocuments(
  fetchedDocuments: FetchedDocument[],
  decisions: PageTriageDecision[]
): void {
  const decisionByCandidateId = new Map(
    decisions.map((decision) => [decision.candidateId, decision])
  );

  for (const document of fetchedDocuments) {
    const decision = decisionByCandidateId.get(document.candidateId);
    if (decision) {
      document.pageTriage = decision;
    }
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function estimateStringBytes(value: string): number {
  return Math.ceil(value.length * 0.75);
}

function combineMode<T extends string>(current: T, next: T): T {
  if (current === "used" || next === "used") return "used" as T;
  if (current === "partial" || next === "partial") return "partial" as T;
  if (current === "fallback" || next === "fallback") return "fallback" as T;
  if (current === "deterministic" || next === "deterministic") {
    return "deterministic" as T;
  }
  return next;
}

function joinFailureReasons(...reasons: Array<string | undefined>): string | undefined {
  const joined = reasons.filter(Boolean).join(" | ");
  return joined || undefined;
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) values.push(value);
}

function appendUniqueCandidates(
  target: EvidenceCandidate[],
  next: EvidenceCandidate[]
): void {
  const seen = new Set(
    target.map((candidate) => candidate.canonicalUrl ?? candidate.sourceUrl ?? candidate.id)
  );

  for (const candidate of next) {
    const key = candidate.canonicalUrl ?? candidate.sourceUrl ?? candidate.id;
    if (seen.has(key)) continue;
    target.push(candidate);
    seen.add(key);
  }
}

function uniqueSources(sources: SignalSource[]): SignalSource[] {
  return Array.from(new Set(sources));
}

function compactSearchQuery(query: string): string {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .filter(
      (token) =>
        !new Set([
          "what",
          "when",
          "while",
          "using",
          "with",
          "into",
          "errors",
          "error",
          "running",
          "cause",
          "causes",
        ]).has(token)
    )
    .slice(0, 5);

  return tokens.length ? tokens.join(" ") : query.slice(0, 80);
}

function sourceCoverage(
  sources: SignalSource[],
  executedSearches: ExecutedSearch[]
): { complete: boolean; missing: SignalSource[] } {
  const required = sources.filter((source) => source !== "reddit");
  const executed = new Set(executedSearches.map((search) => search.source));
  const missing = required.filter((source) => !executed.has(source));
  return {
    complete: missing.length === 0,
    missing,
  };
}

function limitSearchesWithCoverage(
  searches: ResearchSearch[],
  sources: SignalSource[],
  maxQueries: number
): ResearchSearch[] {
  const required = sources.filter((source) => source !== "reddit");
  const selected: ResearchSearch[] = [];

  for (const source of required) {
    const search = searches.find((item) => item.source === source);
    if (search && !selected.includes(search)) {
      selected.push(search);
    }
  }

  for (const search of searches) {
    if (selected.includes(search)) continue;
    if (selected.length >= Math.max(maxQueries, required.length)) break;
    selected.push(search);
  }

  return selected;
}

function isRedditUrl(url: string): boolean {
  try {
    return /(^|\.)reddit\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function bestSnippet(markdown: string): string {
  return markdown.replace(/\s+/g, " ").trim().slice(0, 320);
}
