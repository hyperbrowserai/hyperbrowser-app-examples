import { Hyperbrowser } from "@hyperbrowser/sdk";
import { withTimeout } from "./timeout";

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

export interface FetchResult {
  url: string;
  title?: string;
  markdown: string;
  links: string[];
}

let client: Hyperbrowser | null = null;
const MAX_SEARCH_QUERY_CHARS = 320;
const SEARCH_TIMEOUT_MS = 30_000;
const FETCH_TIMEOUT_MS = 30_000;

function getClient(): Hyperbrowser {
  if (!client) {
    client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY! });
  }
  return client;
}

export async function webSearch(query: string, maxResults = 10): Promise<SearchResult[]> {
  const hb = getClient();
  const normalized = query.replace(/\s+/g, " ").trim();
  const primaryQuery =
    normalized.length > MAX_SEARCH_QUERY_CHARS
      ? normalized.slice(0, MAX_SEARCH_QUERY_CHARS)
      : normalized;

  const doSearch = async (q: string) => {
    const result = await hb.web.search({ query: q });
    return (result.data?.results ?? []).slice(0, maxResults).map((r) => ({
      url: r.url,
      title: r.title ?? "",
      snippet: r.description ?? "",
    }));
  };

  try {
    return await withTimeout(doSearch(primaryQuery), SEARCH_TIMEOUT_MS);
  } catch (err) {
    const fallbackQuery = primaryQuery.slice(0, 160);
    if (fallbackQuery.length > 0 && fallbackQuery !== primaryQuery) {
      return await withTimeout(doSearch(fallbackQuery), SEARCH_TIMEOUT_MS);
    }
    throw err;
  }
}

export async function fetchPage(url: string): Promise<FetchResult> {
  const hb = getClient();
  const result = await withTimeout(
    hb.web.fetch({ url, outputs: { formats: ["markdown", "links"] } }),
    FETCH_TIMEOUT_MS
  );
  return {
    url,
    title: (() => {
      const t = result.data?.metadata?.title;
      if (!t) return undefined;
      return Array.isArray(t) ? t[0] : t;
    })(),
    markdown: result.data?.markdown ?? "",
    links: result.data?.links ?? [],
  };
}
