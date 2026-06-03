import { z } from "zod";
import { extractJsonObject } from "../json-utils";
import { getLLMClient } from "../llm/provider";
import { truncateRunEventText } from "../run-events";
import type { EvidenceCandidate } from "../types";
import type { FetchTarget } from "./types";

const criticSchema = z.object({
  fetchTargets: z
    .array(
      z.object({
        candidateId: z.string(),
        reason: z.string().default("Potentially concrete evidence."),
      })
    )
    .default([]),
  skipCandidateIds: z.array(z.string()).default([]),
  stopReason: z.string().default("Need to inspect concrete source pages."),
});

export async function selectFetchTargets({
  query,
  candidates,
  maxTargets,
  allowLLM,
}: {
  query: string;
  candidates: EvidenceCandidate[];
  maxTargets: number;
  allowLLM: boolean;
}): Promise<{
  targets: FetchTarget[];
  mode: "disabled" | "used" | "fallback";
  callsAttempted: number;
  failureReason?: string;
}> {
  const fetchable = candidates
    .filter((candidate) => candidate.discoveryMethod === "hyperbrowser-search")
    .slice(0, Math.max(maxTargets * 2, maxTargets));

  if (fetchable.length === 0 || maxTargets <= 0) {
    return {
      targets: [],
      mode: allowLLM ? "used" : "disabled",
      callsAttempted: 0,
    };
  }

  if (!allowLLM) {
    return {
      targets: deterministicTargets(fetchable, maxTargets),
      mode: "disabled",
      callsAttempted: 0,
    };
  }

  const llm = getLLMClient();
  if (!llm) {
    return {
      targets: deterministicTargets(fetchable, maxTargets),
      mode: "fallback",
      callsAttempted: 0,
      failureReason: "No LLM provider configured for search-result criticism.",
    };
  }

  try {
    const response = await llm.client.chat.completions.create({
      model: llm.metadata.model ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You choose which search results are worth fetching for grounded developer-pain evidence. Return strict JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Select fetch targets. Be conservative.",
            query,
            candidates: fetchable.map((candidate) => ({
              id: candidate.id,
              source: candidate.source,
              url: candidate.canonicalUrl,
              title: candidate.title,
              snippet: truncateRunEventText(candidate.snippet, 360),
              evidenceKind: candidate.evidenceKind,
            })),
            acceptCriteria: [
              "Fetch pages likely to contain a developer-authored complaint, workaround, incident, bug, issue, or thread.",
              "Prefer forum, GitHub, HN, Reddit comment/post, docs issue, or concrete troubleshooting pages.",
            ],
            rejectCriteria: [
              "Do not fetch login pages, search pages, home pages, category pages, SEO listicles, cookie notices, or block-wall results.",
              "Do not fetch a Reddit subreddit root or Reddit search page.",
            ],
            maxTargets,
            outputShape: {
              fetchTargets: [{ candidateId: "string", reason: "string" }],
              skipCandidateIds: ["string"],
              stopReason: "string",
            },
          }),
        },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("LLM returned empty fetch-target selection.");

    const parsed = criticSchema.parse(extractJsonObject(content));
    const ids = new Set(fetchable.map((candidate) => candidate.id));
    const targets = parsed.fetchTargets
      .filter((target) => ids.has(target.candidateId))
      .slice(0, maxTargets);

    return {
      targets: targets.length ? targets : deterministicTargets(fetchable, maxTargets),
      mode: "used",
      callsAttempted: 1,
    };
  } catch (error) {
    return {
      targets: deterministicTargets(fetchable, maxTargets),
      mode: "fallback",
      callsAttempted: 1,
      failureReason: `Search-result criticism failed: ${error}`,
    };
  }
}

function deterministicTargets(
  candidates: EvidenceCandidate[],
  maxTargets: number
): FetchTarget[] {
  return candidates
    .filter((candidate) => !looksLikeNavigation(candidate))
    .slice(0, maxTargets)
    .map((candidate) => ({
      candidateId: candidate.id,
      reason: "Deterministic fetch target.",
    }));
}

function looksLikeNavigation(candidate: EvidenceCandidate): boolean {
  const text = `${candidate.title} ${candidate.snippet} ${candidate.canonicalUrl ?? ""}`;
  return /sign in|log in|search|skip to content|cookie|blocked|captcha challenge/i.test(
    text
  );
}
