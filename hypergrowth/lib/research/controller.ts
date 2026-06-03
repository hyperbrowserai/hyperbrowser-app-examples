import type { Hyperbrowser } from "@hyperbrowser/sdk";
import { applyEvidenceQualityGate } from "../evidence-quality";
import { fetchMarkdown } from "../hyperbrowser";
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
import { createResearchPlan } from "./planner";
import type {
  FetchAdapter,
  FetchedDocument,
  ResearchBudget,
  ResearchResult,
  SearchAdapter,
} from "./types";

const defaultBudget: ResearchBudget = {
  maxWaves: 2,
  maxQueriesPerWave: 6,
  maxFetchesPerRun: 5,
  maxEvidence: 12,
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
}): Promise<ResearchResult> {
  const effectiveBudget = { ...defaultBudget, ...budget };
  const llm: ResearchResult["llm"] = {
    queryExpansionMode: "disabled",
    candidateTriageMode: "disabled",
    evidenceExtractionMode: "disabled",
    gapExpansionMode: "disabled",
    callsAttempted: 0,
  };
  const errors: string[] = [];
  const candidates: EvidenceCandidate[] = [];
  const searchDiagnostics: SearchDiagnostic[] = [];
  const fetchedDocuments: FetchedDocument[] = [];
  const executedSearches: ExecutedSearch[] = [];

  const planner = await createResearchPlan({
    query,
    selectedSources: sources,
    openWebTargets,
    allowLLM: llm.callsAttempted < llmCallBudget,
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

  for (const wave of planner.plan.waves.slice(0, effectiveBudget.maxWaves)) {
    const waveSearches = wave.searches.slice(0, effectiveBudget.maxQueriesPerWave);

    for (const search of waveSearches) {
      executedSearches.push({ source: search.source, query: search.query, reason: search.reason });
      await emit?.({
        type: "search_query",
        source: search.source,
        query: truncateRunEventText(search.query),
        reason: search.reason,
      });

      const startedAt = Date.now();
      try {
        const found = await withTimeout(
          (searchAdapter ?? defaultSearchAdapter(client))({
            source: search.source,
            query: search.query,
            maxResults: Math.max(3, Math.ceil(maxResults / Math.max(1, sources.length))),
          }),
          effectiveBudget.requestTimeoutMs,
          `${search.source}:${search.query}`
        );
        const durationMs = Date.now() - startedAt;
        candidates.push(...found);
        searchDiagnostics.push({
          source: search.source,
          query: search.query,
          reason: search.reason,
          durationMs,
          status: "success",
          rawSignals: found.length,
        });
        await emit?.({
          type: "source_result",
          source: search.source,
          query: truncateRunEventText(search.query),
          raw: found.length,
          durationMs,
          status: "success",
        });
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        const formatted = formatHyperbrowserError(error);
        addUnique(errors, formatted);
        searchDiagnostics.push({
          source: search.source,
          query: search.query,
          reason: search.reason,
          durationMs,
          status: "error",
          rawSignals: 0,
          error: formatted,
        });
        await emit?.({
          type: "source_result",
          source: search.source,
          query: truncateRunEventText(search.query),
          raw: 0,
          durationMs,
          status: "error",
          error: truncateRunEventText(formatted),
        });
      }
    }

    const initialQuality = applyEvidenceQualityGate(candidates, query);
    const remainingFetches = effectiveBudget.maxFetchesPerRun - fetchesUsed;
    const allowCriticLLM = llmCallBudget >= 3 && llm.callsAttempted < llmCallBudget;
    const critic = await selectFetchTargets({
      query,
      candidates: initialQuality.accepted,
      maxTargets: remainingFetches,
      allowLLM: allowCriticLLM,
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
    for (const target of critic.targets) {
      if (fetchesUsed >= effectiveBudget.maxFetchesPerRun) break;
      const candidate = byId.get(target.candidateId);
      if (!candidate) continue;
      fetchesUsed += 1;

      const fetched = await (fetchAdapter ?? defaultFetchAdapter(client))(candidate);
      fetchedDocuments.push(fetched);

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

    const judged = await judgeEvidence({
      query,
      candidates,
      maxResults: Math.min(maxResults, effectiveBudget.maxEvidence),
      allowLLM: llm.callsAttempted < llmCallBudget,
    });
    llm.evidenceExtractionMode = combineMode(
      llm.evidenceExtractionMode,
      judged.mode
    );
    llm.callsAttempted += judged.callsAttempted;
    llm.failureReason = joinFailureReasons(llm.failureReason, judged.failureReason);

    for (const signal of judged.rawSignals.slice(0, 8)) {
      await emit?.({
        type: "evidence_accepted",
        source: signal.source,
        title: truncateRunEventText(signal.title, 120),
        quote: truncateRunEventText(signal.quote),
      });
    }

    if (judged.rawSignals.length >= Math.min(maxResults, 3)) {
      stopReason = `Stopped after wave ${wave.index}; enough judged evidence was found.`;
      return {
        candidates,
        qualityAccepted: judged.qualityAccepted,
        qualityRejected: judged.qualityRejected,
        rawSignals: judged.rawSignals,
        executedSearches,
        searchDiagnostics,
        rejectedCandidates: judged.qualityRejected.length,
        llm,
        diagnostics: {
          plan: planner.plan,
          searches: searchDiagnostics,
          fetchedDocuments,
          judgments: judged.judgments,
          stopReason,
        },
      };
    }

    stopReason = `Wave ${wave.index} did not produce enough judged evidence.`;
    return {
      candidates,
      qualityAccepted: judged.qualityAccepted,
      qualityRejected: judged.qualityRejected,
      rawSignals: judged.rawSignals,
      executedSearches,
      searchDiagnostics,
      rejectedCandidates: judged.qualityRejected.length,
      llm,
      diagnostics: {
        plan: planner.plan,
        searches: searchDiagnostics,
        fetchedDocuments,
        judgments: judged.judgments,
        stopReason,
      },
    };
  }

  const finalJudged = await judgeEvidence({
    query,
    candidates,
    maxResults: Math.min(maxResults, effectiveBudget.maxEvidence),
    allowLLM: llm.callsAttempted < llmCallBudget,
  });
  llm.evidenceExtractionMode = combineMode(
    llm.evidenceExtractionMode,
    finalJudged.mode
  );
  llm.callsAttempted += finalJudged.callsAttempted;
  llm.failureReason = joinFailureReasons(llm.failureReason, finalJudged.failureReason);

  return {
    candidates,
    qualityAccepted: finalJudged.qualityAccepted,
    qualityRejected: finalJudged.qualityRejected,
    rawSignals: finalJudged.rawSignals,
    executedSearches,
    searchDiagnostics,
    rejectedCandidates: finalJudged.qualityRejected.length,
    llm,
    diagnostics: {
      plan: planner.plan,
      searches: searchDiagnostics,
      fetchedDocuments,
      judgments: finalJudged.judgments,
      stopReason,
    },
  };
}

function defaultSearchAdapter(client: Hyperbrowser): SearchAdapter {
  return ({ source, query, maxResults }) =>
    collectSourceCandidates({ client, source, query, maxResults });
}

function defaultFetchAdapter(client: Hyperbrowser): FetchAdapter {
  return async (candidate) => {
    const url = candidate.canonicalUrl ?? candidate.sourceUrl;

    try {
      const { markdown } = await fetchMarkdown(client, url, {
        stealth: isRedditUrl(url) ? "auto" : undefined,
      });
      return {
        candidateId: candidate.id,
        url,
        markdown,
        status: "success",
      };
    } catch (error) {
      return {
        candidateId: candidate.id,
        url,
        markdown: "",
        status: "error",
        error: formatHyperbrowserError(error),
      };
    }
  };
}

function combineMode<T extends string>(current: T, next: T): T {
  if (current === "used" || next === "used") return "used" as T;
  if (current === "partial" || next === "partial") return "partial" as T;
  if (current === "fallback" || next === "fallback") return "fallback" as T;
  return next;
}

function joinFailureReasons(...reasons: Array<string | undefined>): string | undefined {
  const joined = reasons.filter(Boolean).join(" | ");
  return joined || undefined;
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) values.push(value);
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
