import { CONFIG } from "./config";
import { getAnthropic, withProviderRetry } from "./anthropic";
import { extractCode, type ChatMessage } from "./prompts";
import type { Emit, Usage } from "./types";
import type { MessageParam, Usage as AnthropicUsage } from "@anthropic-ai/sdk/resources/messages";

/** Accumulate real Anthropic usage across every model call in a run. */
export class UsageMeter {
  input = 0;
  output = 0;
  exact = true;

  add(usage?: AnthropicUsage | null) {
    if (usage && typeof usage.input_tokens === "number") {
      this.input +=
        usage.input_tokens +
        (usage.cache_creation_input_tokens ?? 0) +
        (usage.cache_read_input_tokens ?? 0);
      this.output += usage.output_tokens;
    } else {
      // We asked for usage and didn't get it — flag the numbers as inexact.
      this.exact = false;
    }
  }

  snapshot(): Usage {
    const costUsd =
      (this.input / 1_000_000) * CONFIG.modelInputPricePerM +
      (this.output / 1_000_000) * CONFIG.modelOutputPricePerM;
    return { inputTokens: this.input, outputTokens: this.output, costUsd, exact: this.exact };
  }
}

function toAnthropicRequest(messages: ChatMessage[]): { system: string; messages: MessageParam[] } {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const providerMessages: MessageParam[] = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));
  return { system, messages: providerMessages };
}

function textFromContent(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");
}

function firstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Non-streaming JSON call (planner, nav request). Returns parsed object. */
export async function callJson<T>(
  messages: ChatMessage[],
  meter: UsageMeter,
  onRetry?: (attempt: number, waitMs: number) => void
): Promise<T> {
  const client = getAnthropic();
  const request = toAnthropicRequest(messages);
  const response = await withProviderRetry(
    () =>
      client.messages.create({
        model: CONFIG.model,
        max_tokens: CONFIG.jsonMaxTokens,
        system: request.system,
        messages: request.messages,
      }),
    { onRetry }
  );
  meter.add(response.usage);
  const content = textFromContent(response.content);
  const json = firstJsonObject(content);
  if (!json) throw new Error(`${CONFIG.model} did not return JSON: ${content.slice(0, 200)}`);
  return JSON.parse(json) as T;
}

export interface ScriptResult {
  script: string;
  rawContent: string;
}

/** Stream only text blocks; thinking blocks are intentionally not treated as code. */
export async function streamScript(
  messages: ChatMessage[],
  meter: UsageMeter,
  emit: Emit,
  onRetry?: (attempt: number, waitMs: number) => void
): Promise<ScriptResult> {
  const client = getAnthropic();
  const request = toAnthropicRequest(messages);

  return withProviderRetry(
    async () => {
      let rawContent = "";
      let lastFenceStripLen = 0;
      const stream = client.messages.stream({
        model: CONFIG.model,
        max_tokens: CONFIG.scriptMaxTokens,
        system: request.system,
        messages: request.messages,
      });

      for await (const event of stream) {
        if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
        rawContent += event.delta.text;
        const cleaned = extractCode(rawContent);
        if (cleaned.length > lastFenceStripLen) {
          emit({ t: "script_delta", delta: cleaned.slice(lastFenceStripLen) });
          lastFenceStripLen = cleaned.length;
        }
      }

      const finalMessage = await stream.finalMessage();
      meter.add(finalMessage.usage);
      return { script: extractCode(rawContent), rawContent };
    },
    { onRetry }
  );
}
