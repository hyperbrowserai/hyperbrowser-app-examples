import OpenAI from "openai";

let cached: OpenAI | null = null;

export const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

export function getOpenAI(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  cached = new OpenAI({ apiKey });
  return cached;
}
