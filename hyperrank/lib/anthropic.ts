import Anthropic from "@anthropic-ai/sdk";
import { searchWeb } from "./hyperbrowser";
import type {
  EngineQueryResult,
  PromptPlan,
  Scorecard,
} from "./types";

let cached: Anthropic | null = null;

const MODEL = "claude-sonnet-4-6";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  if (!cached) {
    cached = new Anthropic({ apiKey });
  }
  return cached;
}

function extractText(response: Anthropic.Messages.Message): string {
  return response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

const CLAUDE_SEARCH_TOOL: Anthropic.Messages.Tool = {
  name: "search_web",
  description:
    "Search the public web and return a list of relevant results with title, URL, and snippet. Use this when answering questions about real companies, products, or recent information.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query.",
      },
    },
    required: ["query"],
  },
};

const CLAUDE_SYSTEM = `You are answering as Claude would when a user asks you a question and you have web search available. Search the web with the search_web tool when the question is about real companies, products, comparisons, or anything that needs current information. Cite specific sources by URL inline. Be direct: name the products and companies you would recommend, in the order you would recommend them.`;

const MAX_TOOL_ITERATIONS = 3;

interface ClaudeCall {
  query: string;
  hits: { title: string; url: string; description: string }[];
}

export async function queryClaude(prompt: string): Promise<EngineQueryResult> {
  try {
    const client = getClient();
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: prompt },
    ];
    const calls: ClaudeCall[] = [];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: CLAUDE_SYSTEM,
        tools: [CLAUDE_SEARCH_TOOL],
        messages,
      });

      const toolUses = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUses.length === 0 || response.stop_reason !== "tool_use") {
        const text = extractText(response);
        return {
          engine: "claude",
          prompt,
          markdown: formatClaudeMarkdown(text, calls).slice(0, 8000),
          status: text ? "ok" : "failed",
          error: text ? undefined : "empty response",
        };
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const input = (tu.input ?? {}) as { query?: string };
        const query = input.query ?? "";
        if (!query) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify({ error: "missing query" }),
            is_error: true,
          });
          continue;
        }
        try {
          const hits = await searchWeb(query);
          const trimmed = hits.slice(0, 8);
          calls.push({ query, hits: trimmed });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify({
              query,
              results: trimmed.map((h) => ({
                title: h.title,
                url: h.url,
                snippet: h.description,
              })),
            }),
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify({
              error: err instanceof Error ? err.message : "search failed",
            }),
            is_error: true,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }

    return {
      engine: "claude",
      prompt,
      markdown: "",
      status: "failed",
      error: "tool loop did not converge",
    };
  } catch (err) {
    return {
      engine: "claude",
      prompt,
      markdown: "",
      status: "failed",
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

function formatClaudeMarkdown(text: string, calls: ClaudeCall[]): string {
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

function parseJson<T>(text: string): T {
  const fenceStripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = fenceStripped.indexOf("{");
  const end = fenceStripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("model did not return JSON");
  }
  const slice = fenceStripped.slice(start, end + 1);
  return JSON.parse(slice) as T;
}

export interface GeneratePromptPlanInput {
  url: string;
  markdown: string;
  title: string;
  description: string;
}

export async function generatePromptPlan(
  input: GeneratePromptPlanInput
): Promise<PromptPlan> {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are analyzing a company's website to understand their market position.

Website content:
${input.markdown}

Title: ${input.title}
Description: ${input.description}
URL: ${input.url}

Return ONLY a JSON object (no markdown, no backticks) with this exact structure:
{
  "companyName": "the company name",
  "category": "their product category (e.g. project management, CRM, analytics)",
  "description": "one sentence description",
  "competitors": ["competitor1", "competitor2", "competitor3", "competitor4", "competitor5"],
  "prompts": [
    "exactly 6 natural-sounding prompts that a real buyer would ask ChatGPT or Perplexity"
  ]
}

Mix the prompt types:
- Direct brand queries ("what is [company]?", "is [company] good?")
- Category queries ("best [category] tool in 2026")
- Comparison queries ("[company] vs [competitor]")
- Use-case queries ("best [category] for [specific use case]")
- Alternative queries ("[company] alternatives")

Make every prompt phrased the way a real person types into a search box. Output ONLY the JSON object.`,
      },
    ],
  });

  const text = extractText(response);
  const plan = parseJson<PromptPlan>(text);

  if (!plan.companyName || !Array.isArray(plan.prompts) || plan.prompts.length === 0) {
    throw new Error("prompt plan missing required fields");
  }

  plan.prompts = plan.prompts.slice(0, 6);
  plan.competitors = (plan.competitors ?? []).slice(0, 5);
  return plan;
}

export interface AnalyzeInput {
  companyName: string;
  competitors: string[];
  inputUrl: string;
  results: EngineQueryResult[];
}

type AnalysisShape = Omit<Scorecard, "generatedAt" | "inputUrl" | "companyName" | "category" | "description"> & {
  companyName?: string;
  category?: string;
  description?: string;
};

export async function analyzeEngineResults(
  input: AnalyzeInput,
  plan: PromptPlan
): Promise<Scorecard> {
  const client = getClient();

  const blocks = input.results
    .map(
      (r) =>
        `Prompt: "${r.prompt}"\nEngine: ${r.engine}\nStatus: ${r.status}\nResponse:\n${r.markdown || "(no content)"}`
    )
    .join("\n\n---\n\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are analyzing AI search engine responses to determine brand visibility for "${input.companyName}".

Competitors: ${input.competitors.join(", ")}

Raw responses:

${blocks}

Notes:
- Responses marked status="unavailable" should be reported with score=null, mentionRate="—", sentiment="unavailable".
- Responses marked status="failed" should be treated as not_mentioned with score reflecting the failure (0 if all failed, ignored if some succeeded).
- Only count a mention when the company name appears in a recommending or descriptive way, not in unrelated text.
- Citation sources are URLs that AI engines linked to when discussing the company.

Return ONLY a JSON object (no markdown, no backticks):
{
  "overallScore": 0-100,
  "summary": "2-3 sentence executive summary of the company's AI search visibility",
  "engineScores": {
    "chatgpt": { "score": 0-100, "mentionRate": "X/Y", "sentiment": "positive|neutral|negative|not_mentioned" },
    "claude": { "score": 0-100, "mentionRate": "X/Y", "sentiment": "positive|neutral|negative|not_mentioned" },
    "perplexity": { "score": 0-100, "mentionRate": "X/Y", "sentiment": "positive|neutral|negative|not_mentioned" },
    "google": { "score": 0-100, "mentionRate": "X/Y", "sentiment": "positive|neutral|negative|not_mentioned" }
  },
  "competitorComparison": [
    { "name": "competitor1", "mentionCount": 0, "isRecommendedOver": false }
  ],
  "promptsLost": [
    { "prompt": "the prompt", "engine": "perplexity", "competitorMentioned": "competitor name", "reason": "brief explanation" }
  ],
  "citationSources": ["urls"],
  "inaccuracies": ["any factually wrong statements about the company"]
}

Scoring guide:
- 90-100: Mentioned prominently in nearly all relevant prompts, recommended as top choice
- 70-89: Mentioned in most prompts, generally positive
- 50-69: Mentioned sometimes, mixed positioning
- 30-49: Rarely mentioned, competitors dominate
- 0-29: Almost never mentioned by AI search engines

The overall score should average the per-engine scores, ignoring unavailable engines.`,
      },
    ],
  });

  const text = extractText(response);
  const analysis = parseJson<AnalysisShape>(text);

  const scorecard: Scorecard = {
    overallScore: Math.max(0, Math.min(100, Math.round(analysis.overallScore ?? 0))),
    companyName: plan.companyName,
    category: plan.category,
    description: plan.description,
    summary: analysis.summary ?? "",
    engineScores: {
      chatgpt: analysis.engineScores?.chatgpt ?? {
        score: 0,
        mentionRate: "0/0",
        sentiment: "not_mentioned",
      },
      claude: analysis.engineScores?.claude ?? {
        score: 0,
        mentionRate: "0/0",
        sentiment: "not_mentioned",
      },
      perplexity: analysis.engineScores?.perplexity ?? {
        score: 0,
        mentionRate: "0/0",
        sentiment: "not_mentioned",
      },
      google: analysis.engineScores?.google ?? {
        score: 0,
        mentionRate: "0/0",
        sentiment: "not_mentioned",
      },
    },
    competitorComparison: (analysis.competitorComparison ?? []).slice(0, 8),
    promptsLost: (analysis.promptsLost ?? []).slice(0, 10),
    citationSources: Array.from(new Set(analysis.citationSources ?? [])).slice(0, 12),
    inaccuracies: (analysis.inaccuracies ?? []).slice(0, 8),
    generatedAt: new Date().toISOString(),
    inputUrl: input.inputUrl,
  };

  return scorecard;
}
