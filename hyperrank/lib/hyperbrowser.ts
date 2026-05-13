import { Hyperbrowser } from "@hyperbrowser/sdk";
import type { EngineKey, EngineQueryResult } from "./types";

let cached: Hyperbrowser | null = null;

export function getClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not configured");
  }
  if (!cached) {
    cached = new Hyperbrowser({ apiKey });
  }
  return cached;
}

export interface WebSearchHit {
  title: string;
  url: string;
  description: string;
}

export async function searchWeb(query: string): Promise<WebSearchHit[]> {
  const client = getClient();
  const response = await client.web.search({ query });
  if (response.status === "failed") {
    throw new Error(response.error || `web search failed for "${query}"`);
  }
  return response.data?.results ?? [];
}

function formatSearchAsMarkdown(query: string, hits: WebSearchHit[]): string {
  const lines = [`# Web search results for: ${query}`, ""];
  hits.slice(0, 10).forEach((h, i) => {
    lines.push(`## ${i + 1}. ${h.title}`);
    lines.push(h.url);
    lines.push("");
    if (h.description) lines.push(h.description);
    lines.push("");
  });
  return lines.join("\n");
}

export interface CompanyFetch {
  url: string;
  markdown: string;
  title: string;
  description: string;
}

export async function fetchCompanyHomepage(
  url: string
): Promise<CompanyFetch> {
  const client = getClient();
  const result = await client.web.fetch({
    url,
    stealth: "auto",
    outputs: {
      formats: ["markdown"],
      sanitize: "basic",
    },
    navigation: {
      waitFor: 2000,
    },
  });

  if (result.status === "failed") {
    throw new Error(result.error || `Failed to fetch ${url}`);
  }

  const data = result.data ?? {};
  const metadata = (data.metadata ?? {}) as {
    title?: string;
    description?: string;
  };
  const markdown = data.markdown ?? "";

  if (!markdown || markdown.length < 80) {
    throw new Error(
      `Fetched homepage too thin (${markdown.length} chars). Is the URL correct?`
    );
  }

  return {
    url,
    markdown: markdown.slice(0, 12000),
    title: metadata.title ?? "",
    description: metadata.description ?? "",
  };
}

const QUERY_TIMEOUT_MS = 45_000;

export async function fetchEngineQuery(
  engine: Exclude<EngineKey, "chatgpt">,
  prompt: string
): Promise<EngineQueryResult> {
  if (engine === "google") {
    try {
      const hits = await withTimeout(searchWeb(prompt), QUERY_TIMEOUT_MS);
      if (hits.length === 0) {
        return {
          engine,
          prompt,
          markdown: "",
          status: "failed",
          error: "no results",
        };
      }
      return {
        engine,
        prompt,
        markdown: formatSearchAsMarkdown(prompt, hits).slice(0, 8000),
        status: "ok",
      };
    } catch (err) {
      return {
        engine,
        prompt,
        markdown: "",
        status: "failed",
        error: err instanceof Error ? err.message : "unknown error",
      };
    }
  }

  const client = getClient();
  const url = `https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`;

  try {
    const result = await withTimeout(
      client.web.fetch({
        url,
        stealth: "ultra",
        outputs: {
          formats: ["markdown"],
          sanitize: "basic",
        },
        navigation: {
          waitFor: 2000,
        },
      }),
      QUERY_TIMEOUT_MS
    );

    if (result.status === "failed") {
      return {
        engine,
        prompt,
        markdown: "",
        status: "failed",
        error: result.error ?? "fetch failed",
      };
    }

    const markdown = result.data?.markdown ?? "";

    if (!markdown) {
      return {
        engine,
        prompt,
        markdown: "",
        status: "failed",
        error: "empty markdown",
      };
    }

    return {
      engine,
      prompt,
      markdown: markdown.slice(0, 8000),
      status: "ok",
    };
  } catch (err) {
    return {
      engine,
      prompt,
      markdown: "",
      status: "failed",
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
