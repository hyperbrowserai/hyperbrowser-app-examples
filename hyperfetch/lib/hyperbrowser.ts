import { Hyperbrowser } from "@hyperbrowser/sdk";

let cached: Hyperbrowser | null = null;

export function getHyperbrowser(): Hyperbrowser {
  if (cached) return cached;
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not set");
  }
  cached = new Hyperbrowser({ apiKey });
  return cached;
}

export interface FetchedPage {
  markdown: string;
  metadata: Record<string, unknown> | undefined;
  links: string[];
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const client = getHyperbrowser();
  const result = await client.web.fetch({
    url,
    outputs: {
      formats: [{ type: "markdown" }, { type: "links" }],
      sanitize: "none",
    },
    browser: {
      solveCaptchas: true,
    },
  });

  if (result.status !== "completed" || !result.data) {
    throw new Error(result.error || "Failed to fetch page");
  }

  return {
    markdown: result.data.markdown ?? "",
    metadata: result.data.metadata,
    links: result.data.links ?? [],
  };
}
