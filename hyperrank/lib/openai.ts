import OpenAI from "openai";
import type {
  ResponseInputItem,
  ResponseOutputItem,
  Tool,
} from "openai/resources/responses/responses";
import { searchWeb } from "./hyperbrowser";
import type { EngineQueryResult } from "./types";

const MODEL = "gpt-5-mini";
const MAX_TOOL_ITERATIONS = 3;

let cached: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!cached) {
    cached = new OpenAI({ apiKey });
  }
  return cached;
}

const SYSTEM_PROMPT = `You are answering as ChatGPT would when a user asks you a question and you have web search available.

Rules:
- ALWAYS call the search_web tool at least once before answering. Do not answer from memory alone.
- After searching, name specific products and companies by name in your answer. Do not give generic non-answers like "there are many options to consider."
- Cite source URLs inline.
- Be direct and opinionated: recommend specific products in the order you would recommend them, the way a friend would.`;

const SEARCH_TOOL: Tool = {
  type: "function",
  name: "search_web",
  description:
    "Search the public web and return a list of relevant results with title, URL, and snippet. Use when you need current information about companies, products, or comparisons.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
};

interface CollectedCall {
  query: string;
  hits: { title: string; url: string; description: string }[];
}

async function runResponse(prompt: string): Promise<{
  text: string;
  calls: CollectedCall[];
}> {
  const client = getClient();
  const input: ResponseInputItem[] = [
    { role: "user", content: prompt },
  ];
  const calls: CollectedCall[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      tools: [SEARCH_TOOL],
      tool_choice: i === 0 ? { type: "function", name: "search_web" } : "auto",
      input,
    });

    const output = response.output ?? [];
    const functionCalls = output.filter(
      (item): item is Extract<ResponseOutputItem, { type: "function_call" }> =>
        item.type === "function_call"
    );

    if (functionCalls.length === 0) {
      const text = output
        .flatMap((item) =>
          item.type === "message"
            ? item.content.flatMap((c) =>
                c.type === "output_text" ? [c.text] : []
              )
            : []
        )
        .join("\n")
        .trim();
      return { text, calls };
    }

    for (const item of output) {
      input.push(item as ResponseInputItem);
    }

    for (const call of functionCalls) {
      let query = "";
      try {
        const parsed = JSON.parse(call.arguments) as { query?: string };
        query = parsed.query ?? "";
      } catch {
        query = "";
      }

      let outputPayload: string;
      if (!query) {
        outputPayload = JSON.stringify({ error: "missing query" });
      } else {
        try {
          const hits = await searchWeb(query);
          const trimmed = hits.slice(0, 8);
          calls.push({ query, hits: trimmed });
          outputPayload = JSON.stringify({
            query,
            results: trimmed.map((h) => ({
              title: h.title,
              url: h.url,
              snippet: h.description,
            })),
          });
        } catch (err) {
          outputPayload = JSON.stringify({
            error: err instanceof Error ? err.message : "search failed",
          });
        }
      }

      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: outputPayload,
      });
    }
  }

  return { text: "", calls };
}

function formatChatGptMarkdown(text: string, calls: CollectedCall[]): string {
  if (!text) return "";
  if (calls.length === 0) return text;
  const lines = [text, "", "## Searches performed"];
  for (const c of calls) {
    lines.push(`- Query: ${c.query}`);
    for (const h of c.hits.slice(0, 5)) {
      lines.push(`  - ${h.title} — ${h.url}`);
    }
  }
  return lines.join("\n");
}

export async function queryChatGPT(prompt: string): Promise<EngineQueryResult> {
  try {
    const { text, calls } = await runResponse(prompt);
    if (!text) {
      console.error("[chatgpt] empty response for prompt:", prompt);
      return {
        engine: "chatgpt",
        prompt,
        markdown: "",
        status: "failed",
        error: "empty response",
      };
    }
    return {
      engine: "chatgpt",
      prompt,
      markdown: formatChatGptMarkdown(text, calls).slice(0, 8000),
      status: "ok",
    };
  } catch (err) {
    console.error("[chatgpt] error for prompt:", prompt, err);
    return {
      engine: "chatgpt",
      prompt,
      markdown: "",
      status: "failed",
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}
