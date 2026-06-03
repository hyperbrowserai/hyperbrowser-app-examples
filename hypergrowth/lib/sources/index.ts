import type { Hyperbrowser } from "@hyperbrowser/sdk";
import { searchWeb } from "../hyperbrowser";
import { githubEcosystemRepos } from "../taxonomy";
import type {
  EvidenceCandidate,
  EvidenceKind,
  SignalSource,
} from "../types";

type CollectSourceCandidatesInput = {
  client: Hyperbrowser;
  source: SignalSource;
  query: string;
  maxResults: number;
};

type GitHubSearchResponse = {
  items?: Array<{
    html_url?: string;
    title?: string;
    body?: string | null;
    user?: { login?: string };
    created_at?: string;
    updated_at?: string;
    comments?: number;
    comments_url?: string;
    repository_url?: string;
    labels?: Array<{ name?: string }>;
    reactions?: { total_count?: number };
  }>;
};

type GitHubComment = {
  body?: string | null;
  user?: { login?: string };
  created_at?: string;
  reactions?: { total_count?: number };
};

type HNHit = {
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
};

export async function collectSourceCandidates({
  client,
  source,
  query,
  maxResults,
}: CollectSourceCandidatesInput): Promise<EvidenceCandidate[]> {
  if (source === "github") {
    return collectGitHubCandidates(query, maxResults);
  }

  if (source === "hackernews") {
    return collectHackerNewsCandidates(query, maxResults);
  }

  if (source === "reddit") {
    throw new Error(
      "Direct Reddit API collection is disabled. Use Hyperbrowser open-web subreddit targets instead."
    );
  }

  return collectHyperbrowserCandidates(client, query, maxResults);
}

async function collectGitHubCandidates(
  query: string,
  maxResults: number
): Promise<EvidenceCandidate[]> {
  const searchQuery = query.toLowerCase().includes("is:issue")
    ? query
    : `${query} is:issue`;
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(
    searchQuery
  )}&sort=updated&order=desc&per_page=${Math.min(maxResults, 10)}`;
  const response = await fetch(url, {
    headers: githubHeaders(),
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }

  const payload = (await response.json()) as GitHubSearchResponse;
  const candidates: EvidenceCandidate[] = [];

  for (const item of payload.items ?? []) {
    if (candidates.length >= maxResults) break;

    const canonicalUrl = item.html_url ?? url;
    const repo = detectGithubRepo(
      item.repository_url?.replace("https://api.github.com/repos/", "") ??
        canonicalUrl
    );
    const body = stripMarkdown(item.body ?? "");
    const comments = item.comments_url
      ? await fetchGitHubComments(item.comments_url, 2).catch(() => [])
      : [];
    const commentBody = comments
      .map((comment) => stripMarkdown(comment.body ?? ""))
      .filter(Boolean)
      .slice(0, 2)
      .join("\n\n");

    candidates.push({
      id: candidateId("github", canonicalUrl, candidates.length),
      source: "github",
      discoveryMethod: "api",
      sourceUrl: url,
      canonicalUrl,
      title: item.title?.trim() || "GitHub issue",
      snippet: firstMeaningfulText([body, commentBody, item.title ?? ""]),
      body: [body, commentBody].filter(Boolean).join("\n\n"),
      author: item.user?.login,
      publishedAt: item.created_at ?? item.updated_at,
      engagement: {
        comments: item.comments,
        reactions: item.reactions?.total_count,
      },
      evidenceKind: "issue",
      repo,
      ecosystemBoost: repo ? isEcosystemRepo(repo) : undefined,
      sourceReliabilityOverride: 0.86,
      raw: item,
      qualityFlags: [],
    });
  }

  return candidates;
}

async function fetchGitHubComments(
  commentsUrl: string,
  maxComments: number
): Promise<GitHubComment[]> {
  const response = await fetch(`${commentsUrl}?per_page=${maxComments}`, {
    headers: githubHeaders(),
  });

  if (!response.ok) return [];
  return ((await response.json()) as GitHubComment[]).slice(0, maxComments);
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "HyperGrowth",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function collectHackerNewsCandidates(
  query: string,
  maxResults: number
): Promise<EvidenceCandidate[]> {
  const perType = Math.max(1, Math.ceil(maxResults / 2));
  const [stories, comments] = await Promise.all([
    fetchHackerNewsHits(query, "story", perType),
    fetchHackerNewsHits(query, "comment", perType),
  ]);

  return [...stories, ...comments].slice(0, maxResults);
}

async function fetchHackerNewsHits(
  query: string,
  tag: "story" | "comment",
  maxResults: number
): Promise<EvidenceCandidate[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
    query
  )}&tags=${tag}&hitsPerPage=${maxResults}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HN Algolia returned ${response.status}`);
  }

  const payload = (await response.json()) as { hits?: HNHit[] };

  return (payload.hits ?? []).map((hit, index) => {
    const title =
      hit.title?.trim() || hit.story_title?.trim() || "Hacker News discussion";
    const hnUrl = hit.objectID
      ? `https://news.ycombinator.com/item?id=${hit.objectID}`
      : hit.story_id
        ? `https://news.ycombinator.com/item?id=${hit.story_id}`
        : url;
    const text = stripHtml(hit.story_text ?? hit.comment_text ?? "");

    return {
      id: candidateId("hackernews", hnUrl, index),
      source: "hackernews" as const,
      discoveryMethod: "api" as const,
      sourceUrl: hnUrl,
      canonicalUrl:
        tag === "comment" ? hnUrl : hit.url || hit.story_url || hnUrl,
      title,
      snippet: firstMeaningfulText([text, title]),
      body: text,
      author: hit.author,
      publishedAt: hit.created_at,
      engagement: {
        score: hit.points,
        comments: hit.num_comments,
      },
      evidenceKind: tag,
      sourceReliabilityOverride: tag === "story" ? 0.76 : 0.7,
      raw: hit,
      qualityFlags: [],
    };
  });
}

async function collectHyperbrowserCandidates(
  client: Hyperbrowser,
  query: string,
  maxResults: number
): Promise<EvidenceCandidate[]> {
  const results = await searchWeb(client, query);

  return results
    .filter((result) => isAllowedHyperbrowserResult(result.url))
    .slice(0, maxResults)
    .map((result, index) => ({
      id: candidateId("hyperbrowser", result.url, index),
      source: "hyperbrowser",
      discoveryMethod: "hyperbrowser-search",
      sourceUrl: `hyperbrowser-search:${query}`,
      canonicalUrl: result.url,
      title: result.title,
      snippet: result.description,
      evidenceKind: inferEvidenceKind(result.url),
      sourceReliabilityOverride: isRedditUrl(result.url) ? 0.62 : 0.72,
      raw: result,
      qualityFlags: [],
    }));
}

export function isAllowedHyperbrowserResult(url: string): boolean {
  if (!isRedditUrl(url)) return true;

  const parsed = safeUrl(url);
  if (!parsed) return false;

  const path = parsed.pathname.toLowerCase();
  if (path.includes("/search")) return false;
  if (path.includes("/login")) return false;
  if (path.startsWith("/user/")) return false;
  if (/^\/r\/[^/]+\/?$/.test(path)) return false;

  return /\/r\/[^/]+\/comments\//.test(path) || path.includes("/comments/");
}

function isRedditUrl(url: string): boolean {
  return /(^|\.)reddit\.com$/i.test(safeUrl(url)?.hostname ?? "");
}

function safeUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function inferEvidenceKind(url: string): EvidenceKind {
  const lower = url.toLowerCase();

  if (lower.includes("github.com")) return "issue";
  if (lower.includes("reddit.com")) return "post";
  if (lower.includes("news.ycombinator.com")) return "comment";
  if (lower.includes("forum") || lower.includes("discourse")) return "forum-thread";
  if (lower.includes("blog")) return "article";
  return "web-page";
}

function candidateId(source: SignalSource, key: string, index: number): string {
  const compact = key
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${source}-${compact || index + 1}`;
}

function firstMeaningfulText(values: string[]): string {
  return values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .find((value) => value.length > 0) ?? "";
}

function detectGithubRepo(value: string): string | undefined {
  const match = value.match(/github\.com\/([^/\s]+\/[^/\s#?]+)/i);
  if (match) return match[1].replace(/\.git$/, "");

  const apiMatch = value.match(/^([^/\s]+\/[^/\s#?]+)$/);
  return apiMatch?.[1];
}

function isEcosystemRepo(repo: string): boolean {
  const normalized = repo.toLowerCase();
  return githubEcosystemRepos.some((candidate) =>
    normalized.includes(candidate.toLowerCase())
  );
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(value: string): string {
  return stripHtml(
    value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  );
}
