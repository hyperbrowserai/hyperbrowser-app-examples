import type { Hyperbrowser } from "@hyperbrowser/sdk";
import { fetchMarkdown } from "../hyperbrowser";
import { githubEcosystemRepos } from "../taxonomy";
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

  if (source === "reddit") {
    const redditSignals = await mineReddit(client, query, maxResults).catch(
      () => []
    );

    if (redditSignals.length > 0) return redditSignals;
  }

  return mineWithHyperbrowser(client, source, query, maxResults);
}

async function mineHackerNewsAlgolia(
  query: string,
  maxResults: number
): Promise<RawSignal[]> {
  const [stories, comments] = await Promise.all([
    fetchHackerNewsHits(query, "story", Math.ceil(maxResults / 2)),
    fetchHackerNewsHits(query, "comment", Math.ceil(maxResults / 2)),
  ]);

  return [...stories, ...comments].slice(0, maxResults);
}

async function fetchHackerNewsHits(
  query: string,
  tag: "story" | "comment",
  maxResults: number
): Promise<RawSignal[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
    query
  )}&tags=${tag}&hitsPerPage=${maxResults}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HN Algolia returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    hits?: Array<{
      title?: string;
      story_title?: string;
      story_text?: string;
      comment_text?: string;
      url?: string;
      story_url?: string;
      story_id?: number;
      objectID?: string;
      author?: string;
      created_at?: string;
      points?: number;
      num_comments?: number;
    }>;
  };

  return (payload.hits ?? [])
    .map((hit) => {
      const title =
        hit.title?.trim() ||
        hit.story_title?.trim() ||
        "Hacker News discussion";
      const hnUrl = hit.objectID
        ? `https://news.ycombinator.com/item?id=${hit.objectID}`
        : hit.story_id
          ? `https://news.ycombinator.com/item?id=${hit.story_id}`
        : url;
      const quote = stripHtml(hit.story_text ?? hit.comment_text ?? title);

      return {
        source: "hackernews" as const,
        sourceUrl: hnUrl,
        canonicalUrl: hit.url || hit.story_url || hnUrl,
        title,
        quote,
        author: hit.author,
        publishedAt: hit.created_at,
        evidenceKind: tag,
        sourceReliabilityOverride: tag === "story" ? 0.76 : 0.7,
        engagement: {
          score: hit.points,
          comments: hit.num_comments,
        },
        raw: hit,
      };
    })
    .filter((signal) => signal.quote.length >= 20);
}

async function mineReddit(
  client: Hyperbrowser,
  query: string,
  maxResults: number
): Promise<RawSignal[]> {
  const selectedSubreddits = [
    "webscraping",
    "webdev",
    "learnpython",
    "programming",
    "automation",
    "LocalLLaMA",
    "LangChain",
  ];
  const signals: RawSignal[] = [];
  const perSubredditLimit = Math.max(1, Math.ceil(maxResults / 3));

  for (const subreddit of selectedSubreddits.slice(0, 3)) {
    if (signals.length >= maxResults) break;

    const searchUrl = `https://www.reddit.com/r/${subreddit}/search/?q=${encodeURIComponent(
      query
    )}&restrict_sr=1&sort=relevance`;
    const mined = await mineWithHyperbrowser(
      client,
      "reddit",
      query,
      perSubredditLimit,
      searchUrl,
      {
        evidenceKind: "post",
        sourceReliabilityOverride: 0.62,
      }
    );

    signals.push(...mined);
  }

  if (signals.length < maxResults) {
    const globalSearchUrl = sourceConfigs.reddit.searchUrl(query);
    signals.push(
      ...(await mineWithHyperbrowser(
        client,
        "reddit",
        query,
        maxResults - signals.length,
        globalSearchUrl,
        {
          evidenceKind: "post",
          sourceReliabilityOverride: 0.55,
        }
      ))
    );
  }

  return signals.slice(0, maxResults);
}

async function mineWithHyperbrowser(
  client: Hyperbrowser,
  source: SignalSource,
  query: string,
  maxResults: number,
  explicitSearchUrl?: string,
  metadata: Partial<RawSignal> = {}
): Promise<RawSignal[]> {
  const config = sourceConfigs[source];
  const searchUrl = explicitSearchUrl ?? config.searchUrl(query);
  const { markdown, links } = await fetchMarkdown(client, searchUrl, {
    stealth: source === "reddit" ? "auto" : undefined,
  });
  const candidates = extractCandidateLines(markdown, query);
  const normalizedLinks = normalizeLinks(links, searchUrl);

  return candidates.slice(0, maxResults).map((candidate, index) => {
    const url = normalizedLinks[index] ?? searchUrl;
    const repo = source === "github" ? detectGithubRepo(url) : undefined;
    const ecosystemBoost = repo ? isEcosystemRepo(repo) : undefined;

    return {
      source,
      sourceUrl: searchUrl,
      canonicalUrl: url,
      title: extractTitle(candidate, config.label),
      quote: candidate,
      evidenceKind: source === "github" ? "issue" : "search-result",
      repo,
      ecosystemBoost,
      ...metadata,
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

function detectGithubRepo(url: string): string | undefined {
  const match = url.match(/github\.com\/([^/\s]+\/[^/\s?#]+)/i);
  return match?.[1];
}

function isEcosystemRepo(repo: string): boolean {
  const normalizedRepo = repo.toLowerCase();

  return githubEcosystemRepos.some(
    (ecosystemRepo) => ecosystemRepo.toLowerCase() === normalizedRepo
  );
}

function dedupeLines(line: string, index: number, lines: string[]): boolean {
  return lines.findIndex((candidate) => candidate === line) === index;
}
