import { z } from "zod";
import { extractJsonObject } from "../json-utils";
import { isLLMTransportError } from "./errors";
import { getLLMClient } from "./provider";
import type { EvidenceCandidate, ExecutedSearch, SignalSource } from "../types";

const gapSchema = z.object({
  shouldSearchAgain: z.boolean(),
  source: z.enum(["hackernews", "github", "hyperbrowser"]).optional(),
  query: z.string().optional(),
  rationale: z.string().optional(),
});

type SearchGapResult = {
  search?: ExecutedSearch;
  callsAttempted: number;
  mode: "disabled" | "used" | "fallback";
  failureReason?: string;
};

export async function planSearchGap({
  query,
  selectedSources,
  candidates,
  allowLLM,
}: {
  query: string;
  selectedSources: SignalSource[];
  candidates: EvidenceCandidate[];
  allowLLM: boolean;
}): Promise<SearchGapResult> {
  if (!allowLLM || candidates.length >= 4) {
    return { callsAttempted: 0, mode: "disabled" };
  }

  const llm = getLLMClient();
  if (!llm) {
    return { callsAttempted: 0, mode: "disabled" };
  }

  let callsAttempted = 0;

  try {
    callsAttempted += 1;
    const search = await requestGapSearch(query, selectedSources, candidates);
    return { search, callsAttempted, mode: search ? "used" : "disabled" };
  } catch (error) {
    if (isLLMTransportError(error)) {
      return {
        callsAttempted,
        mode: "fallback",
        failureReason: `Search gap transport failed: ${error}`,
      };
    }

    return {
      callsAttempted,
      mode: "fallback",
      failureReason: `Search gap planning failed: ${error}`,
    };
  }
}

async function requestGapSearch(
  query: string,
  selectedSources: SignalSource[],
  candidates: EvidenceCandidate[]
): Promise<ExecutedSearch | undefined> {
  const llm = getLLMClient();
  if (!llm) throw new Error("No LLM provider configured.");

  const response = await llm.client.chat.completions.create({
    model: llm.metadata.model ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You identify one missing search that could improve developer growth evidence. Return strict JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          query,
          selectedSources,
          currentCandidates: candidates.map((candidate) => ({
            source: candidate.source,
            title: candidate.title,
            snippet: candidate.snippet,
          })),
          constraints: [
            "Only request one additional search.",
            "Prefer hyperbrowser for broad web and subreddit-targeted gaps, GitHub for implementation pain, HN for market discussion.",
            "Query must be 80 characters or fewer.",
            "Source must be one of selectedSources.",
          ],
          shape: {
            shouldSearchAgain: true,
            source: "hyperbrowser",
            query: "string",
            rationale: "string",
          },
        }),
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("LLM returned empty search gap plan.");

  const parsed = gapSchema.parse(extractJsonObject(content));
  if (!parsed.shouldSearchAgain || !parsed.source || !parsed.query) return undefined;
  if (!selectedSources.includes(parsed.source)) return undefined;

  return {
    source: parsed.source,
    query: parsed.query.replace(/\s+/g, " ").trim().slice(0, 80),
    reason: "expanded",
  };
}
