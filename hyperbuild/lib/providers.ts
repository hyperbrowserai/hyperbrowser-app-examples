export type ScrapeInput = { url: string };
export type ExtractInput = { url: string; schema: unknown };
export type CrawlInput = { seedUrls: string[]; maxPages?: number };

export interface WebAutomationProvider {
  name: string;
  scrapeMarkdown(input: ScrapeInput): Promise<string>;
  extractStructured<T = unknown>(input: ExtractInput): Promise<T | null>;
  crawlMarkdown(input: CrawlInput): Promise<string>;
}

type ProviderKey = "hyperbrowser";

const providers: Partial<Record<ProviderKey, WebAutomationProvider>> = {};

export function registerProvider(key: ProviderKey, impl: WebAutomationProvider) {
  providers[key] = impl;
}

export function getProvider(): WebAutomationProvider {
  const key = (process.env.WEB_PROVIDER || "hyperbrowser") as ProviderKey;
  const impl = providers[key];
  if (!impl) throw new Error(`No provider registered for ${key}`);
  return impl;
}


