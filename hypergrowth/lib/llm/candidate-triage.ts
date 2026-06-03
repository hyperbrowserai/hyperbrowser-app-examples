import { z } from "zod";
import { extractJsonObject } from "../json-utils";
import { isLLMTransportError } from "./errors";
import { getLLMClient } from "./provider";
import type { EvidenceCandidate } from "../types";

const triageSchema = z.object({
  selectedCandidateIds: z.array(z.string()).default([]),
  rejectedCandidateIds: z.array(z.string()).default([]),
  rationale: z.array(z.string()).default([]),
});

type CandidateTriageResult = {
  selectedCandidateIds: string[];
  callsAttempted: number;
  mode: "disabled" | "used" | "fallback";
  failureReason?: string;
};

export async function triageCandidatesWithLLM({
  query,
  candidates,
}: {
  query: string;
  candidates: EvidenceCandidate[];
}): Promise<CandidateTriageResult> {
  if (candidates.length === 0) {
    return { selectedCandidateIds: [], callsAttempted: 0, mode: "disabled" };
  }

  const llm = getLLMClient();
  if (!llm) {
    return {
      selectedCandidateIds: candidates.map((candidate) => candidate.id),
      callsAttempted: 0,
      mode: "disabled",
      failureReason: "No LLM provider configured for candidate triage.",
    };
  }

  let callsAttempted = 0;

  try {
    callsAttempted += 1;
    const selectedCandidateIds = await requestCandidateTriage(query, candidates);
    return { selectedCandidateIds, callsAttempted, mode: "used" };
  } catch (error) {
    if (isLLMTransportError(error)) {
      return fallback(candidates, callsAttempted, `Candidate triage transport failed: ${error}`);
    }

    try {
      callsAttempted += 1;
      const selectedCandidateIds = await requestCandidateTriage(
        query,
        candidates,
        String(error)
      );
      return { selectedCandidateIds, callsAttempted, mode: "used" };
    } catch (repairError) {
      return fallback(
        candidates,
        callsAttempted,
        `Candidate triage failed after repair: ${repairError}`
      );
    }
  }
}

async function requestCandidateTriage(
  query: string,
  candidates: EvidenceCandidate[],
  repairInput?: string
): Promise<string[]> {
  const llm = getLLMClient();
  if (!llm) throw new Error("No LLM provider configured.");

  const response = await llm.client.chat.completions.create({
    model: llm.metadata.model ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You triage public developer evidence candidates for HyperGrowth. Select only candidates worth fetching or extracting. Return strict JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: repairInput
            ? "Repair the previous triage failure and return valid JSON."
            : "Select evidence candidates that look like real developer pain.",
          previousFailure: repairInput,
          query,
          constraints: [
            "Reject login pages, block pages, no-result messages, nav chrome, and generic docs.",
            "Prefer developer-authored issues, posts, comments, forum threads, or concrete workaround pages.",
            "Do not select more than 16 candidates.",
            "Only return candidate IDs that were provided.",
          ],
          candidates: candidates.map((candidate) => ({
            id: candidate.id,
            source: candidate.source,
            title: candidate.title,
            snippet: candidate.snippet,
            evidenceKind: candidate.evidenceKind,
            url: candidate.canonicalUrl ?? candidate.sourceUrl,
          })),
          shape: {
            selectedCandidateIds: ["string"],
            rejectedCandidateIds: ["string"],
            rationale: ["string"],
          },
        }),
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("LLM returned empty candidate triage.");

  const parsed = triageSchema.parse(extractJsonObject(content));
  const validIds = new Set(candidates.map((candidate) => candidate.id));
  return parsed.selectedCandidateIds
    .filter((id) => validIds.has(id))
    .slice(0, 16);
}

function fallback(
  candidates: EvidenceCandidate[],
  callsAttempted: number,
  failureReason: string
): CandidateTriageResult {
  return {
    selectedCandidateIds: candidates.map((candidate) => candidate.id),
    callsAttempted,
    mode: "fallback",
    failureReason,
  };
}
