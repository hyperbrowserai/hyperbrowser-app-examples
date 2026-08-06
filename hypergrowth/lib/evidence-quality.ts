import { painTerms, toolTerms } from "./taxonomy";
import { matchedTerms, tokenize, unique } from "./text";
import type { EvidenceCandidate, EvidenceQualityFlag } from "./types";

const noisePatterns = [
  /you signed in with another tab/i,
  /you've been blocked/i,
  /you have been blocked/i,
  /network security/i,
  /file a ticket/i,
  /no stories matching/i,
  /search for comments/i,
  /enable javascript/i,
];

export function applyEvidenceQualityGate(
  candidates: EvidenceCandidate[],
  query: string
): { accepted: EvidenceCandidate[]; rejected: EvidenceCandidate[] } {
  const accepted: EvidenceCandidate[] = [];
  const rejected: EvidenceCandidate[] = [];

  for (const candidate of candidates) {
    const qualityFlags = unique([
      ...candidate.qualityFlags,
      ...classifyCandidate(candidate, query),
    ]) as EvidenceQualityFlag[];
    const next = { ...candidate, qualityFlags };

    if (qualityFlags.some(isHardRejectFlag)) {
      rejected.push(next);
    } else {
      accepted.push(next);
    }
  }

  return { accepted, rejected };
}

function isHardRejectFlag(flag: EvidenceQualityFlag): boolean {
  return (
    flag === "login_required" ||
    flag === "blocked" ||
    flag === "no_results" ||
    flag === "navigation_chrome"
  );
}

export function isNoiseEvidence(text: string): boolean {
  return noisePatterns.some((pattern) => pattern.test(text));
}

function classifyCandidate(
  candidate: EvidenceCandidate,
  query: string
): EvidenceQualityFlag[] {
  const text = `${candidate.title} ${candidate.snippet} ${candidate.body ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
  const lower = text.toLowerCase();
  const flags: EvidenceQualityFlag[] = [];

  if (text.length < 40) flags.push("too_short");
  if (candidate.snippet.length < 24 && !candidate.body) flags.push("thin_snippet");
  if (noisePatterns.some((pattern) => pattern.test(text))) {
    if (/blocked|network security|file a ticket/i.test(text)) {
      flags.push("blocked");
    } else if (/sign in|log in|signed in/i.test(text)) {
      flags.push("login_required");
    } else if (/no stories matching/i.test(text)) {
      flags.push("no_results");
    } else {
      flags.push("navigation_chrome");
    }
  }

  const queryTokens = tokenize(query).filter((token) => token.length > 3);
  const usefulTerms = unique([...queryTokens, ...toolTerms, ...painTerms]);
  const overlap = matchedTerms(lower, usefulTerms);
  if (overlap.length === 0) flags.push("weak_query_overlap");

  return unique(flags) as EvidenceQualityFlag[];
}
