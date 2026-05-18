import { Hyperbrowser } from "@hyperbrowser/sdk";

const FETCH_TIMEOUT_MS = 180_000;

export async function fetchTweetMarkdown(url: string): Promise<string> {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not set");
  }

  const client = new Hyperbrowser({
    apiKey,
    timeout: FETCH_TIMEOUT_MS,
  });

  const result = await client.web.fetch({
    url,
    stealth: "auto",
    outputs: {
      formats: ["markdown"],
    },
    navigation: {
      waitUntil: "networkidle",
      timeoutMs: 60_000,
    },
    browser: {
      solveCaptchas: true,
    },
  });

  if (result.status !== "completed") {
    throw new Error(result.error || `Fetch status: ${result.status}`);
  }

  const markdown = result.data?.markdown;
  if (!markdown) {
    throw new Error("Could not extract page content from the URL");
  }

  return markdown;
}
