import { githubEcosystemRepos } from "./taxonomy";
import type { EvidenceCandidate, EvidenceKind, RawSignal } from "./types";

export function deterministicExtract(
  candidates: EvidenceCandidate[],
  query: string
): RawSignal[] {
  return candidates
    .map((candidate) => candidateToRawSignal(candidate, query))
    .filter((signal): signal is RawSignal => Boolean(signal));
}

function candidateToRawSignal(
  candidate: EvidenceCandidate,
  query: string
): RawSignal | undefined {
  const quote = bestQuote(candidate.body || candidate.snippet, query);
  if (quote.length < 40) return undefined;

  return {
    source: candidate.source,
    sourceUrl: candidate.sourceUrl,
    canonicalUrl: candidate.canonicalUrl,
    title: candidate.title,
    quote,
    author: candidate.author,
    publishedAt: candidate.publishedAt,
    engagement: candidate.engagement,
    evidenceKind: candidate.evidenceKind ?? inferEvidenceKind(candidate),
    repo: candidate.repo,
    ecosystemBoost: candidate.ecosystemBoost ?? detectEcosystemBoost(candidate),
    sourceReliabilityOverride: candidate.sourceReliabilityOverride,
    raw: candidate.raw,
  };
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

function inferEvidenceKind(candidate: EvidenceCandidate): EvidenceKind {
  if (candidate.evidenceKind) return candidate.evidenceKind;
  if (candidate.source === "github") return "issue";
  if (candidate.source === "reddit") return "post";
  if (candidate.source === "hackernews") return "comment";
  return "web-page";
}

function detectEcosystemBoost(candidate: EvidenceCandidate): boolean | undefined {
  const haystack = `${candidate.repo ?? ""} ${candidate.canonicalUrl ?? ""}`.toLowerCase();
  if (!haystack) return undefined;
  return githubEcosystemRepos.some((repo) => haystack.includes(repo.toLowerCase()));
}
