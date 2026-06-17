import { Hyperbrowser } from "@hyperbrowser/sdk";

// Single shared Hyperbrowser client. Used for both sandbox operations and the
// web fetch that powers the agent's `browse` tool.

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

// The base sandbox image. Override with SANDBOX_IMAGE if your account exposes a
// different node-capable image name. Available images include: node,
// node-chromium, python, default.
export const SANDBOX_IMAGE = process.env.SANDBOX_IMAGE || "node";

// Ports must be declared at sandbox creation to be routable — exposing an
// undeclared port later returns "session not found". We pre-declare the common
// dev-server ports so the agent can serve on any of them and get a live URL.
export const EXPOSED_PORTS = [3000, 3001, 4173, 4321, 5000, 5173, 8000, 8080];

export interface BrowseResult {
  text: string;
  screenshot?: string;
}

// Pull a live page from the public web for the agent's `browse` tool.
export async function browseWeb(url: string): Promise<BrowseResult> {
  const client = getClient();
  const result = await client.web.fetch({
    url,
    stealth: "auto",
    outputs: {
      formats: ["markdown", "screenshot"],
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
  const markdown = (data.markdown ?? "").slice(0, 10000);

  return {
    text: markdown,
    screenshot: data.screenshot,
  };
}
