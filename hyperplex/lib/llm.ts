import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { withTimeout } from "./timeout";

// ─── Zod schemas for validated output ────────────────────────────────────────

const CitationSchema = z.object({
  url: z.string(),
  title: z.string(),
  quote: z.string(),
});

const SynthesisResultSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
});

const SubtaskPlanItemSchema = z.object({
  task: z.string(),
  model: z.string(),
  searchQuery: z.string(),
});

const SubtaskPlanArraySchema = z.array(SubtaskPlanItemSchema);

export type Citation = z.infer<typeof CitationSchema>;
export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;

interface SourceDoc {
  url: string;
  title?: string;
  markdown: string;
}

// ─── Model registry ───────────────────────────────────────────────────────────

export const MODELS = {
  // Anthropic
  "claude-opus-4-6":    { provider: "anthropic", label: "Claude Opus 4.6",    apiKeyEnv: "ANTHROPIC_API_KEY" },
  "claude-sonnet-4-6":  { provider: "anthropic", label: "Claude Sonnet 4.6",  apiKeyEnv: "ANTHROPIC_API_KEY" },
  "claude-haiku-4-5":   { provider: "anthropic", label: "Claude Haiku 4.5",   apiKeyEnv: "ANTHROPIC_API_KEY" },
  // OpenAI
  "gpt-5-mini":          { provider: "openai",    label: "GPT-5 mini",          apiKeyEnv: "OPENAI_API_KEY" },
  "o4-mini":            { provider: "openai",    label: "o4-mini",            apiKeyEnv: "OPENAI_API_KEY" },
  // Google
  "gemini-3.1-pro-preview":  { provider: "google", label: "Gemini 3.1 Pro",  apiKeyEnv: "GOOGLE_API_KEY" },
  "gemini-3-flash-preview":  { provider: "google", label: "Gemini 3 Flash",  apiKeyEnv: "GOOGLE_API_KEY" },
} as const;

export type ModelId = keyof typeof MODELS | "auto";

// Auto-selection priority: best available model based on set API keys
const AUTO_PRIORITY: Array<keyof typeof MODELS> = [
  "claude-sonnet-4-6",
  "gpt-5-mini",
  "gemini-3-flash-preview",
  "claude-haiku-4-5",
  "o4-mini",
  "gemini-3.1-pro-preview",
];

export function resolveModel(model: string): keyof typeof MODELS {
  if (model !== "auto" && model in MODELS) {
    return model as keyof typeof MODELS;
  }
  // Auto: pick first model whose API key is set
  for (const id of AUTO_PRIORITY) {
    const env = MODELS[id].apiKeyEnv;
    if (process.env[env]) return id;
  }
  throw new Error(
    "No API keys found. Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY"
  );
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a research assistant. Given a research goal and a set of source documents, produce a comprehensive answer with citations.

Return ONLY a valid JSON object with this exact structure:
{
  "answer": "Your detailed markdown answer here",
  "citations": [
    { "url": "https://...", "title": "Source Title", "quote": "relevant quote from the source" }
  ]
}

Rules:
- answer should be in markdown format with clear sections
- Reference sources inline using [1], [2] etc notation matching citation array index + 1
- Include only citations you actually used
- Be thorough but concise
- NEVER use emojis in the answer`;

function buildUserMessage(goal: string, sources: SourceDoc[]): string {
  const capped = sources.slice(0, 8);
  const sourcesText = capped
    .map((s, i) => {
      const trimmed = s.markdown.slice(0, 3000);
      return `--- SOURCE ${i + 1} ---\nURL: ${s.url}\nTitle: ${s.title ?? "Unknown"}\n\n${trimmed}`;
    })
    .join("\n\n");
  return `Research goal: ${goal}\n\n${sourcesText}`;
}

function extractAndValidateSynthesis(text: string): SynthesisResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Model did not return valid JSON: " + text.slice(0, 200));
  const raw = JSON.parse(match[0]);
  const parsed = SynthesisResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Schema validation failed: ${JSON.stringify(parsed.error)}`);
  }
  return parsed.data;
}

// ─── Provider implementations (return raw text) ──────────────────────────────

const LLM_TIMEOUT_MS = 120_000;

async function callLLM(
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  const { provider } = MODELS[modelId as keyof typeof MODELS];

  const call = async (): Promise<string> => {
    if (provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await anthropic.messages.create({
        model: modelId,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      return msg.content[0].type === "text" ? msg.content[0].text : "";
    }

    if (provider === "openai") {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.chat.completions.create({
        model: modelId,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });
      return res.choices[0]?.message?.content ?? "";
    }

    // Google
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const m = genAI.getGenerativeModel({ model: modelId, systemInstruction: systemPrompt });
    const result = await m.generateContent(userMessage);
    return result.response.text();
  };

  return withTimeout(call(), LLM_TIMEOUT_MS);
}

// ─── Goal decomposition ────────────────────────────────────────────────────────

export interface SubtaskPlan {
  task: string;
  model: keyof typeof MODELS;
  searchQuery: string;
}

const DECOMPOSE_SYSTEM = `You are a research planning agent. Break a research goal into 3-5 focused subtasks that can be researched independently and in parallel.

For each subtask assign the best model based on the task nature:
- "claude-sonnet-4-6" → analysis, synthesis, structured reasoning
- "claude-opus-4-6" → complex multi-step reasoning, nuanced topics
- "claude-haiku-4-5" → quick facts, simple lookups
- "gpt-5-mini" → data-heavy research, comparisons, web content
- "o4-mini" → fast reasoning, math, coding-related queries
- "gemini-3.1-pro-preview" → advanced reasoning, long-context research
- "gemini-3-flash-preview" → recent events, fast multimodal lookups

Return ONLY a valid JSON array, no markdown, no extra text, no emojis:
[
  { "task": "description of subtask", "model": "model-id", "searchQuery": "web search query" }
]`;

function extractAndValidatePlans(text: string): SubtaskPlan[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Failed to decompose goal: no JSON array returned");
  const raw = JSON.parse(match[0]);
  const parsed = SubtaskPlanArraySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Plan schema validation failed: ${JSON.stringify(parsed.error)}`);
  }
  return parsed.data.map((p) => ({
    ...p,
    model: (p.model in MODELS ? p.model : resolveModel("auto")) as keyof typeof MODELS,
  }));
}

export async function decomposeGoal(
  goal: string,
  preferredModel = "auto"
): Promise<SubtaskPlan[]> {
  const plannerModel = resolveModel(preferredModel);
  const userMsg = `Research goal: ${goal}\n\nDecompose this into 3-5 focused subtasks. Only use models from the allowed list.`;

  const text = await callLLM(plannerModel, DECOMPOSE_SYSTEM, userMsg, 1024);

  try {
    return extractAndValidatePlans(text);
  } catch (firstErr) {
    // Retry once with corrective prompt
    const retryMsg = `Your previous response was invalid JSON. Error: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}\n\nPlease return ONLY a valid JSON array with the exact schema:\n[{ "task": "...", "model": "...", "searchQuery": "..." }]\n\nOriginal goal: ${goal}`;
    const retryText = await callLLM(plannerModel, DECOMPOSE_SYSTEM, retryMsg, 1024);
    return extractAndValidatePlans(retryText);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function synthesize(
  goal: string,
  sources: SourceDoc[],
  model: string = "auto"
): Promise<{ result: SynthesisResult; resolvedModel: string }> {
  const resolvedModel = resolveModel(model);
  const userMessage = buildUserMessage(goal, sources);
  const text = await callLLM(resolvedModel, SYSTEM_PROMPT, userMessage);

  try {
    const result = extractAndValidateSynthesis(text);
    return { result, resolvedModel };
  } catch (firstErr) {
    const retryMsg = `Your previous response was invalid. Error: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}\n\nPlease return ONLY a valid JSON object with this exact schema:\n{"answer": "markdown string", "citations": [{"url": "...", "title": "...", "quote": "..."}]}\n\nOriginal goal: ${goal}`;
    const retryText = await callLLM(resolvedModel, SYSTEM_PROMPT, retryMsg);
    const result = extractAndValidateSynthesis(retryText);
    return { result, resolvedModel };
  }
}

// ─── Streaming synthesis ─────────────────────────────────────────────────────

export async function synthesizeStream(
  goal: string,
  sources: SourceDoc[],
  model: string = "auto",
  onChunk?: (text: string) => void
): Promise<{ result: SynthesisResult; resolvedModel: string }> {
  const resolvedModel = resolveModel(model);
  const { provider } = MODELS[resolvedModel];
  const userMessage = buildUserMessage(goal, sources);
  let fullText = "";

  if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = anthropic.messages.stream({
      model: resolvedModel,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullText += event.delta.text;
        onChunk?.(event.delta.text);
      }
    }
  } else if (provider === "openai") {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = await openai.chat.completions.create({
      model: resolvedModel,
      max_completion_tokens: 4096,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onChunk?.(delta);
      }
    }
  } else {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const m = genAI.getGenerativeModel({ model: resolvedModel, systemInstruction: SYSTEM_PROMPT });
    const stream = await m.generateContentStream(userMessage);
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        onChunk?.(text);
      }
    }
  }

  const result = extractAndValidateSynthesis(fullText);
  return { result, resolvedModel };
}
