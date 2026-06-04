import {
  categorizePain,
  painTerms,
  titleCase,
  toolTerms,
} from "./taxonomy";
import { matchedTerms, unique } from "./text";
import type { PainSignal, RawSignal, Urgency } from "./types";

export function normalizeSignals(
  rawSignals: RawSignal[],
  query: string,
  extractedAt = new Date().toISOString()
): PainSignal[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);

  return rawSignals
    .map((raw, index) => normalizeSignal(raw, queryTerms, extractedAt, index))
    .filter((signal) => signal.quote.length >= 15);
}

function normalizeSignal(
  raw: RawSignal,
  queryTerms: string[],
  extractedAt: string,
  index: number
): PainSignal {
  const text = `${raw.title} ${raw.quote}`;
  const toolsMentioned = unique(
    matchedTerms(text, toolTerms).map((term) =>
      term === "anti-bot" ? "anti-bot" : titleCase(term)
    )
  );
  const matched = unique([...matchedTerms(text, queryTerms), ...matchedTerms(text, painTerms)]);
  const painCategory = categorizePain(text);
  const engagement = collapseEngagement(raw.engagement);

  return {
    id: `${raw.source}-${index + 1}`,
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    canonicalUrl: raw.canonicalUrl ?? raw.sourceUrl,
    title: raw.title.trim().slice(0, 140),
    url: raw.canonicalUrl ?? raw.sourceUrl,
    quote: raw.quote.replace(/\s+/g, " ").trim(),
    author: raw.author,
    publishedAt: raw.publishedAt,
    extractedAt,
    engagement,
    engagementDetails: raw.engagement,
    evidenceKind: raw.evidenceKind,
    repo: raw.repo,
    ecosystemBoost: raw.ecosystemBoost,
    sourceReliabilityOverride: raw.sourceReliabilityOverride,
    matchedTerms: matched,
    toolsMentioned,
    painCategory,
    urgency: scoreUrgency(text),
  };
}

function collapseEngagement(engagement?: RawSignal["engagement"]): number | undefined {
  if (!engagement) return undefined;

  const values = [
    engagement.score,
    engagement.comments,
    engagement.stars,
    engagement.reactions,
  ].filter((value): value is number => typeof value === "number");

  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0);
}

function scoreUrgency(text: string): Urgency {
  const lower = text.toLowerCase();

  if (
    ["blocked", "broken", "fails", "failing", "captcha", "production", "impossible"].some(
      (term) => lower.includes(term)
    )
  ) {
    return "high";
  }

  if (
    ["hard", "slow", "brittle", "retry", "proxy", "timeout"].some((term) =>
      lower.includes(term)
    )
  ) {
    return "medium";
  }

  return "low";
}
