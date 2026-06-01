import type { Hyperbrowser } from "@hyperbrowser/sdk";
import { fetchMarkdown } from "../hyperbrowser";
import type { PainSignal, SignalSource, Urgency } from "../types";

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

const toolTerms = [
  "playwright",
  "puppeteer",
  "selenium",
  "captcha",
  "cloudflare",
  "proxy",
  "proxies",
  "scraping",
  "crawler",
  "browser",
  "session",
  "anti-bot",
  "blocked",
];

export async function mineSource(
  client: Hyperbrowser,
  source: SignalSource,
  query: string,
  maxResults: number
): Promise<PainSignal[]> {
  const config = sourceConfigs[source];
  const url = config.searchUrl(query);
  const { markdown, links } = await fetchMarkdown(client, url);
  const candidates = extractCandidateLines(markdown, query);
  const normalizedLinks = normalizeLinks(links, url);

  return candidates.slice(0, maxResults).map((candidate, index) => {
    const toolsMentioned = findTools(candidate);

    return {
      id: `${source}-${index + 1}`,
      source,
      title: candidate.slice(0, 96),
      url: normalizedLinks[index] ?? url,
      quote: candidate,
      toolsMentioned,
      painCategory: categorize(candidate),
      urgency: scoreUrgency(candidate),
      engagement: undefined,
    };
  });
}

function extractCandidateLines(markdown: string, query: string): string[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 3);

  const allTerms = Array.from(new Set([...queryTerms, ...toolTerms]));

  return markdown
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 80 && line.length <= 320)
    .filter((line) => {
      const lower = line.toLowerCase();
      return allTerms.some((term) => lower.includes(term));
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

function findTools(text: string): string[] {
  const lower = text.toLowerCase();
  return toolTerms
    .filter((term) => lower.includes(term))
    .map((term) => (term === "anti-bot" ? "anti-bot" : titleCase(term)));
}

function categorize(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes("captcha") || lower.includes("cloudflare")) {
    return "anti-bot reliability";
  }

  if (lower.includes("proxy") || lower.includes("session")) {
    return "browser infrastructure";
  }

  if (lower.includes("javascript") || lower.includes("render")) {
    return "dynamic page extraction";
  }

  if (lower.includes("scale") || lower.includes("queue")) {
    return "automation at scale";
  }

  return "developer workflow friction";
}

function scoreUrgency(text: string): Urgency {
  const lower = text.toLowerCase();

  if (
    ["blocked", "broken", "fails", "failing", "captcha", "production"].some(
      (term) => lower.includes(term)
    )
  ) {
    return "high";
  }

  if (
    ["hard", "slow", "brittle", "retry", "proxy"].some((term) =>
      lower.includes(term)
    )
  ) {
    return "medium";
  }

  return "low";
}

function dedupeLines(line: string, index: number, lines: string[]): boolean {
  return lines.findIndex((candidate) => candidate === line) === index;
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
