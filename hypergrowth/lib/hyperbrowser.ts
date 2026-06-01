import { Hyperbrowser } from "@hyperbrowser/sdk";

export function getHyperbrowserClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing HYPERBROWSER_API_KEY");
  }

  return new Hyperbrowser({ apiKey });
}

export async function fetchMarkdown(
  client: Hyperbrowser,
  url: string
): Promise<{ markdown: string; links: unknown[] }> {
  const response = (await client.web.fetch({
    url,
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
