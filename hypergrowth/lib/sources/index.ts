import type { Hyperbrowser } from "@hyperbrowser/sdk";
import { fetchMarkdown } from "../hyperbrowser";
import type { RawSignal, SignalSource } from "../types";

type SourceConfig = {
  label: string;
  searchUrl: (query: string) => string;
};

export const sourceConfigs: Record<SignalSource, SourceConfig> = {
  hackernews: {
    label: "Hacker News",
    searchUrl: (query) =>
      `https://hn.algolia.com/?q=${encodeURIComponent(query)}`,
  },
  github: {
    label: "GitHub Issues",
    searchUrl: (query) =>
      `https://github.com/search?q=${encodeURIComponent(query)}&type=issues`,
  },
  reddit: {
    label: "Reddit",
    searchUrl: (query) =>
      `https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=relevance`,
  },
};

export async function mineSource(
  client: Hyperbrowser,
  source: SignalSource,
  query: string,
  maxResults: number
): Promise<RawSignal[]> {
  if (source === "hackernews") {
    const algoliaSignals = await mineHackerNewsAlgolia(query, maxResults).catch(
      () => []
    );

    if (algoliaSignals.length > 0) return algoliaSignals;
  }

  return mineWithHyperbrowser(client, source, query, maxResults);
}

async function mineHackerNewsAlgolia(
  query: string,
  maxResults: number
): Promise<RawSignal[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
    query
  )}&tags=story&hitsPerPage=${maxResults}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HN Algolia returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    hits?: Array<{
      title?: string;
      story_text?: string;
      url?: string;
      objectID?: string;
      author?: string;
      created_at?: string;
      points?: number;
      num_comments?: number;
    }>;
  };

  return (payload.hits ?? [])
    .map((hit) => {
      const title = hit.title?.trim() || "Hacker News discussion";
      const hnUrl = hit.objectID
        ? `https://news.ycombinator.com/item?id=${hit.objectID}`
        : url;
      const quote = stripHtml(hit.story_text ?? title);

      return {
        source: "hackernews" as const,
        sourceUrl: hnUrl,
        canonicalUrl: hit.url || hnUrl,
        title,
        quote,
        author: hit.author,
        publishedAt: hit.created_at,
        engagement: {
          score: hit.points,
          comments: hit.num_comments,
        },
        raw: hit,
      };
    })
    .filter((signal) => signal.quote.length >= 20);
}

async function mineWithHyperbrowser(
  client: Hyperbrowser,
  source: SignalSource,
  query: string,
  maxResults: number
): Promise<RawSignal[]> {
  const config = sourceConfigs[source];
  const searchUrl = config.searchUrl(query);
  const { markdown, links } = await fetchMarkdown(client, searchUrl);
  const candidates = extractCandidateLines(markdown, query);
  const normalizedLinks = normalizeLinks(links, searchUrl);

  return candidates.slice(0, maxResults).map((candidate, index) => {
    const url = normalizedLinks[index] ?? searchUrl;

    return {
      source,
      sourceUrl: searchUrl,
      canonicalUrl: url,
      title: extractTitle(candidate, config.label),
      quote: candidate,
    };
  });
}

function extractCandidateLines(markdown: string, query: string): string[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 3);
  const sourceTerms = [
    ...queryTerms,
    "playwright",
    "puppeteer",
    "selenium",
    "captcha",
    "cloudflare",
    "proxy",
    "scraping",
    "browser",
    "session",
    "blocked",
    "broken",
    "fails",
  ];

  return markdown
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 70 && line.length <= 360)
    .filter((line) => {
      const lower = line.toLowerCase();
      return sourceTerms.some((term) => lower.includes(term));
    })
    .filter(dedupeLines);
}

function normalizeLinks(links: unknown[], fallbackUrl: string): string[] {
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
    .filter((link) => link.startsWith("http") && link !== fallbackUrl);
}

function extractTitle(candidate: string, fallback: string): string {
  const withoutMarkdown = candidate.replace(/^\s*#+\s*/, "").trim();
  const firstSentence = withoutMarkdown.split(/[.!?]/)[0]?.trim();
  return (firstSentence || fallback).slice(0, 140);
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeLines(line: string, index: number, lines: string[]): boolean {
  return lines.findIndex((candidate) => candidate === line) === index;
}
