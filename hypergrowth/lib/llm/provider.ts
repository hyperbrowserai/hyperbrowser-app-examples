import OpenAI from "openai";
import type { LLMProviderMetadata } from "../types";

export type LLMClientConfig = {
  client: OpenAI;
  metadata: LLMProviderMetadata;
  defaultHeaders?: Record<string, string>;
};

export function resolveLLMProvider(): LLMProviderMetadata {
  if (process.env.LLM_API_KEY) {
    return {
      available: true,
      provider: process.env.LLM_PROVIDER ?? "custom",
      model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
      baseURL: process.env.LLM_BASE_URL,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      available: true,
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    };
  }

  return { available: false };
}

export function getLLMClient(): LLMClientConfig | null {
  const metadata = resolveLLMProvider();

  if (!metadata.available) return null;

  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const defaultHeaders = buildProviderHeaders(metadata.provider);

  return {
    client: new OpenAI({
      apiKey,
      baseURL: metadata.baseURL,
      defaultHeaders,
      timeout: getLLMTimeoutMs(),
      maxRetries: 0,
    }),
    metadata,
    defaultHeaders,
  };
}

export function getLLMTimeoutMs(): number {
  const configured = Number.parseInt(process.env.LLM_TIMEOUT_MS ?? "", 10);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return 12_000;
}

function buildProviderHeaders(provider?: string): Record<string, string> | undefined {
  if (provider !== "openrouter") return undefined;

  const headers: Record<string, string> = {};

  if (process.env.LLM_SITE_URL) {
    headers["HTTP-Referer"] = process.env.LLM_SITE_URL;
  }

  if (process.env.LLM_APP_NAME) {
    headers["X-Title"] = process.env.LLM_APP_NAME;
  }

  return Object.keys(headers).length ? headers : undefined;
}
