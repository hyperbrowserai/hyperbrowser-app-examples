import type { Hyperbrowser } from "@hyperbrowser/sdk";
import { deterministicExtract } from "./deterministic-extraction";
import { fetchMarkdown } from "./hyperbrowser";
import { extractEvidenceWithLLM } from "./llm/evidence-extraction";
import { triageCandidatesWithLLM } from "./llm/candidate-triage";
import type {
  EvidenceCandidate,
  LLMUsageMetadata,
  RawSignal,
} from "./types";

type PrepareEvidenceInput = {
  client: Hyperbrowser;
  query: string;
  candidates: EvidenceCandidate[];
  maxResults: number;
  allowTriage: boolean;
  allowExtraction: boolean;
};

type PrepareEvidenceResult = {
  rawSignals: RawSignal[];
  rejectedCandidates: number;
  llm: Pick<
    LLMUsageMetadata,
    | "candidateTriageMode"
    | "evidenceExtractionMode"
    | "callsAttempted"
    | "failureReason"
  >;
};

export async function prepareEvidence({
  client,
  query,
  candidates,
  maxResults,
  allowTriage,
  allowExtraction,
}: PrepareEvidenceInput): Promise<PrepareEvidenceResult> {
  const triage = allowTriage
    ? await triageCandidatesWithLLM({ query, candidates })
    : {
        selectedCandidateIds: candidates.map((candidate) => candidate.id),
        callsAttempted: 0,
        mode: "disabled" as const,
      };
  const selectedIds = new Set(triage.selectedCandidateIds);
  const selected = candidates
    .filter((candidate) => selectedIds.has(candidate.id))
    .slice(0, Math.max(maxResults * 2, maxResults));
  const enriched = await enrichCandidates(client, selected, query);
  const extraction = allowExtraction
    ? await extractEvidenceWithLLM({ query, candidates: enriched })
    : {
        rawSignals: deterministicExtract(enriched, query),
        callsAttempted: 0,
        mode: "disabled" as const,
      };
  const rawSignals = extraction.rawSignals.length
    ? extraction.rawSignals
    : deterministicExtract(enriched, query);
  const failureReason = [triage.failureReason, extraction.failureReason]
    .filter(Boolean)
    .join(" | ");

  return {
    rawSignals: rawSignals.slice(0, maxResults),
    rejectedCandidates:
      candidates.length - selected.length + Math.max(0, selected.length - rawSignals.length),
    llm: {
      candidateTriageMode: triage.mode,
      evidenceExtractionMode: extraction.mode,
      callsAttempted: triage.callsAttempted + extraction.callsAttempted,
      failureReason: failureReason || undefined,
    },
  };
}

async function enrichCandidates(
  client: Hyperbrowser,
  candidates: EvidenceCandidate[],
  query: string
): Promise<EvidenceCandidate[]> {
  const enriched: EvidenceCandidate[] = [];

  for (const candidate of candidates) {
    if (!shouldFetchCandidate(candidate)) {
      enriched.push(candidate);
      continue;
    }

    try {
      const url = candidate.canonicalUrl ?? candidate.sourceUrl;
      const { markdown } = await fetchMarkdown(client, url, {
        stealth: isRedditUrl(url) ? "auto" : undefined,
      });
      enriched.push({
        ...candidate,
        discoveryMethod:
          candidate.discoveryMethod === "hyperbrowser-search"
            ? "hyperbrowser-fetch"
            : candidate.discoveryMethod,
        body: markdown || candidate.body,
        snippet: candidate.snippet || bestQuote(markdown, query),
      });
    } catch {
      enriched.push(candidate);
    }
  }

  return enriched;
}

function isRedditUrl(url: string): boolean {
  try {
    return /(^|\.)reddit\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function shouldFetchCandidate(candidate: EvidenceCandidate): boolean {
  if (!candidate.canonicalUrl) return false;
  if (candidate.discoveryMethod === "hyperbrowser-search") return true;
  if (candidate.body && candidate.body.length > 120) return false;
  return candidate.source === "hackernews";
}

function bestQuote(text: string | undefined, query: string): string {
  const source = (text ?? "").replace(/\s+/g, " ").trim();
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 3);

  const sentences = source
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 40 && item.length <= 420);

  return (
    sentences.find((sentence) => {
      const lower = sentence.toLowerCase();
      return queryTerms.some((term) => lower.includes(term));
    }) ??
    sentences[0] ??
    source.slice(0, 420)
  );
}
