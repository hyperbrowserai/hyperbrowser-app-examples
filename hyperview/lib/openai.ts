import OpenAI from "openai";

// Shared OpenAI client. The agent that drives the sandbox runs on this.
// Model is overridable via OPENAI_MODEL but defaults to the requested gpt-5.4-mini.

let cached: OpenAI | null = null;

export const AGENT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!cached) {
    cached = new OpenAI({ apiKey });
  }
  return cached;
}
