import { Hyperbrowser } from "@hyperbrowser/sdk";
import type { WebAutomationProvider } from "./providers";

export type ScrapeParams = {
  url: string;
  viewport?: { width: number; height: number };
  screenshot?: boolean;
};

export type ExtractParams = {
  url: string;
  schema: unknown;
};

const hb = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
});

export async function scrapeMarkdown(params: ScrapeParams): Promise<string> {
  const resp = await hb.scrape.startAndWait(params);
  return resp?.data?.markdown ?? "";
}

export async function extractStructured<T = unknown>(params: ExtractParams): Promise<T | null> {
  const resp = await hb.extract.startAndWait({ urls: [params.url], schema: params.schema as object });
  return (resp?.data as T) ?? null;
}

export { hb };

export async function crawlMarkdown(params: { seedUrls: string[]; maxPages?: number }): Promise<string> {
  const resp = await hb.crawl.startAndWait({ url: params.seedUrls[0], maxPages: params.maxPages });
  let markdown = "";
  if (Array.isArray(resp?.data)) {
    for (const page of resp.data) {
      if (page?.markdown) markdown += `\n-----\nUrl: ${page.url}\n${page.markdown}`;
    }
  }
  return markdown.trim();
}

export const HyperbrowserProvider: WebAutomationProvider = {
  name: "hyperbrowser",
  scrapeMarkdown: (i) => scrapeMarkdown(i),
  extractStructured: (i) => extractStructured(i),
  crawlMarkdown: (i) => crawlMarkdown(i),
};


