import { Hyperbrowser } from "@hyperbrowser/sdk";

const MAX_QUERY_CHARS = 320;

function getClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not configured");
  }
  return new Hyperbrowser({ apiKey });
}

export interface HyperbrowserSearchHit {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Run a web search via Hyperbrowser's search API.
 */
export async function hyperbrowserSearch(
  query: string,
  maxResults = 10
): Promise<HyperbrowserSearchHit[]> {
  const hb = getClient();
  const normalized = query.replace(/\s+/g, " ").trim();
  const q =
    normalized.length > MAX_QUERY_CHARS
      ? normalized.slice(0, MAX_QUERY_CHARS)
      : normalized;

  if (!q) {
    throw new Error("Search query is empty");
  }

  const result = await hb.web.search({ query: q });
  const rows = result.data?.results ?? [];

  return rows.slice(0, maxResults).map((r) => ({
    url: r.url,
    title: r.title ?? "",
    snippet: r.description ?? "",
  }));
}
