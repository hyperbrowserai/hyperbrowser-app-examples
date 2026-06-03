import { Hyperbrowser } from "@hyperbrowser/sdk";

const defaultHyperbrowserTimeoutMs = 12_000;
type HyperbrowserStealthMode = "none" | "auto" | "ultra";
type WebSearchResultItem = {
  title: string;
  url: string;
  description: string;
};

export function getHyperbrowserClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing HYPERBROWSER_API_KEY");
  }

  return new Hyperbrowser({
    apiKey,
    timeout: getHyperbrowserTimeoutMs(),
  });
}

export async function fetchMarkdown(
  client: Hyperbrowser,
  url: string,
  options: { stealth?: HyperbrowserStealthMode } = {}
): Promise<{ markdown: string; links: unknown[] }> {
  const response = (await client.web.fetch({
    url,
    stealth: options.stealth,
    navigation: {
      waitUntil: "domcontentloaded",
      timeoutMs: getHyperbrowserTimeoutMs(),
    },
    outputs: {
      formats: ["markdown", "links"],
    },
  })) as unknown;

  const data =
    typeof response === "object" && response !== null && "data" in response
      ? (response as { data?: unknown }).data
      : response;

  if (typeof data !== "object" || data === null) {
    return { markdown: "", links: [] };
  }

  const record = data as Record<string, unknown>;

  return {
    markdown:
      typeof record.markdown === "string"
        ? record.markdown
        : typeof record.content === "string"
          ? record.content
          : "",
    links: Array.isArray(record.links) ? record.links : [],
  };
}

export async function searchWeb(
  client: Hyperbrowser,
  query: string
): Promise<WebSearchResultItem[]> {
  const response = await client.web.search({ query });

  if (response.status !== "completed" && response.error) {
    throw new Error(response.error);
  }

  return response.data?.results ?? [];
}

function getHyperbrowserTimeoutMs(): number {
  const configured = Number.parseInt(
    process.env.HYPERBROWSER_TIMEOUT_MS ?? "",
    10
  );

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return defaultHyperbrowserTimeoutMs;
}
