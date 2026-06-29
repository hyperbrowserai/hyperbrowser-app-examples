import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { Action } from "./browser.ts";
import type { ModelId } from "../lib/types.ts";

// Every model receives the IDENTICAL system prompt and the IDENTICAL
// observation. The ONLY thing that changes between backends is which endpoint
// is called. This is what makes the benchmark defensible.

const SYSTEM_PROMPT = `You are a web agent operating a real browser through a text interface.

Each turn you are given:
- The current page URL and title.
- A numbered list of interactive elements: [index] tag "label".
- The visible page text.

Your job is to accomplish the GOAL by choosing exactly ONE next action.

Respond with a single JSON object, nothing else:
- {"action":"click","target":<index>} to click an element by its index.
- {"action":"type","target":<index>,"text":"<text>"} to type into an input (this also presses Enter).
- {"action":"done"} when the goal is accomplished or cannot be progressed.

Rules:
- Choose targets only from the listed element indices.
- Take one concrete step toward the goal. Do not explain. Output only the JSON object.`;

export type HistoryEntry = { observation: string; action: Action; result: string };

function buildUserMessage(
  observation: string,
  goal: string,
  history: HistoryEntry[]
): string {
  const recent = history
    .slice(-5)
    .map(
      (h, i) =>
        `Step ${history.length - Math.min(history.length, 5) + i + 1}: ${JSON.stringify(
          h.action
        )} -> ${h.result}`
    )
    .join("\n");

  return [
    `GOAL: ${goal}`,
    history.length ? `\nRECENT ACTIONS:\n${recent}` : "",
    `\nCURRENT PAGE:\n${observation}`,
    `\nReturn the next action as a single JSON object.`,
  ].join("\n");
}

// JSON schema describing the action object (used for the strongest output
// guarantees on each provider).
const ACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["click", "type", "done"] },
    target: { type: "integer" },
    text: { type: "string" },
  },
  required: ["action"],
} as const;

function parseAction(raw: string): Action {
  let obj: Record<string, unknown>;
  try {
    // tolerate fenced or padded output
    const match = raw.match(/\{[\s\S]*\}/);
    obj = JSON.parse(match ? match[0] : raw);
  } catch {
    return { action: "done" };
  }
  const action = obj.action;
  if (action === "click" && typeof obj.target === "number") {
    return { action: "click", target: obj.target };
  }
  if (action === "type" && typeof obj.target === "number") {
    return { action: "type", target: obj.target, text: String(obj.text ?? "") };
  }
  return { action: "done" };
}

// ---- backends ----

let anthropic: Anthropic | null = null;
let glm: OpenAI | null = null;
let gpt: OpenAI | null = null;

function getAnthropic(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

function getGlm(): OpenAI {
  if (!glm) {
    if (!process.env.GLM_BASE_URL) throw new Error("GLM_BASE_URL is not set");
    if (!process.env.GLM_API_KEY) throw new Error("GLM_API_KEY is not set");
    glm = new OpenAI({
      baseURL: process.env.GLM_BASE_URL,
      apiKey: process.env.GLM_API_KEY,
    });
  }
  return glm;
}

function getGpt(): OpenAI {
  if (!gpt) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
    gpt = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return gpt;
}

async function decideOpenAICompatible(
  client: OpenAI,
  model: string,
  user: string
): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 300,
  });
  return res.choices[0]?.message?.content ?? "";
}

async function decideClaude(user: string): Promise<string> {
  // Opus 4.8: structured JSON via output_config.format. No thinking (off by
  // default) and no temperature/top_p — both rejected on 4.8.
  const res = await getAnthropic().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema: ACTION_SCHEMA } },
  } as Anthropic.MessageCreateParamsNonStreaming);

  for (const block of res.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

// The single entry point. Routes to one backend; the prompt and observation
// are identical regardless of which model is chosen.
export async function decideAction(
  model: ModelId,
  observation: string,
  goal: string,
  history: HistoryEntry[]
): Promise<Action> {
  const user = buildUserMessage(observation, goal, history);

  let raw: string;
  if (model === "glm-5.2") {
    raw = await decideOpenAICompatible(getGlm(), process.env.GLM_MODEL || "", user);
  } else if (model === "gpt-5.5") {
    raw = await decideOpenAICompatible(getGpt(), process.env.OPENAI_MODEL || "", user);
  } else {
    raw = await decideClaude(user);
  }

  return parseAction(raw);
}
