import { z } from "zod";
import { deterministicExtract } from "../deterministic-extraction";
import { extractJsonObject } from "../json-utils";
import { isLLMTransportError } from "./errors";
import { getLLMClient } from "./provider";
import type { EvidenceCandidate, RawSignal } from "../types";

const evidenceKinds = [
  "story",
  "comment",
  "issue",
  "post",
  "discussion",
  "search-result",
  "article",
  "forum-thread",
  "web-page",
] as const;

const extractionSchema = z.object({
  evidence: z.array(
    z.object({
      candidateId: z.string(),
      isEvidence: z.boolean(),
      title: z.string(),
      quote: z.string(),
      evidenceKind: z.enum(evidenceKinds).optional(),
      rejectedReason: z.string().optional(),
    })
  ),
});

type EvidenceExtractionResult = {
  rawSignals: RawSignal[];
  callsAttempted: number;
  mode: "disabled" | "used" | "fallback" | "partial";
  failureReason?: string;
};

export async function extractEvidenceWithLLM({
  query,
  candidates,
}: {
  query: string;
  candidates: EvidenceCandidate[];
}): Promise<EvidenceExtractionResult> {
  if (candidates.length === 0) {
    return { rawSignals: [], callsAttempted: 0, mode: "disabled" };
  }

  const llm = getLLMClient();
  if (!llm) {
    return {
      rawSignals: deterministicExtract(candidates, query),
      callsAttempted: 0,
      mode: "disabled",
      failureReason: "No LLM provider configured for evidence extraction.",
    };
  }

  let callsAttempted = 0;

  try {
    callsAttempted += 1;
    const rawSignals = await requestEvidenceExtraction(query, candidates);
    return {
      rawSignals,
      callsAttempted,
      mode: rawSignals.length === candidates.length ? "used" : "partial",
    };
  } catch (error) {
    if (isLLMTransportError(error)) {
      return fallback(query, candidates, callsAttempted, `Evidence extraction transport failed: ${error}`);
    }

    try {
      callsAttempted += 1;
      const rawSignals = await requestEvidenceExtraction(query, candidates, String(error));
      return {
        rawSignals,
        callsAttempted,
        mode: rawSignals.length === candidates.length ? "used" : "partial",
      };
    } catch (repairError) {
      return fallback(
        query,
        candidates,
        callsAttempted,
        `Evidence extraction failed after repair: ${repairError}`
      );
    }
  }
}

async function requestEvidenceExtraction(
  query: string,
  candidates: EvidenceCandidate[],
  repairInput?: string
): Promise<RawSignal[]> {
  const llm = getLLMClient();
  if (!llm) throw new Error("No LLM provider configured.");

  const response = await llm.client.chat.completions.create({
    model: llm.metadata.model ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract grounded developer pain evidence for HyperGrowth. Use only supplied source text. Return strict JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: repairInput
            ? "Repair the previous extraction failure and return valid JSON."
            : "Extract real developer-authored pain evidence.",
          previousFailure: repairInput,
          query,
          constraints: [
            "Set isEvidence=false for login pages, block walls, no-result pages, nav chrome, or generic marketing.",
            "Quotes must be copied from title, snippet, or body text.",
            "Quotes should be concise but specific, 40 to 420 characters when possible.",
            "Do not invent people, companies, URLs, or pain.",
          ],
          candidates: candidates.map((candidate) => ({
            candidateId: candidate.id,
            source: candidate.source,
            title: candidate.title,
            snippet: candidate.snippet,
            body: candidate.body?.slice(0, 2400),
            evidenceKind: candidate.evidenceKind,
            url: candidate.canonicalUrl ?? candidate.sourceUrl,
          })),
          shape: {
            evidence: [
              {
                candidateId: "string",
                isEvidence: true,
                title: "string",
                quote: "string",
                evidenceKind: "issue",
                rejectedReason: "string",
              },
            ],
          },
        }),
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("LLM returned empty evidence extraction.");

  const parsed = extractionSchema.parse(extractJsonObject(content));
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const rawSignals: RawSignal[] = [];

  for (const item of parsed.evidence) {
    if (!item.isEvidence) continue;

    const candidate = candidateById.get(item.candidateId);
    if (!candidate) continue;

    const quote = groundedQuote(item.quote, candidate);
    if (!quote) continue;

    rawSignals.push({
      source: candidate.source,
      sourceUrl: candidate.sourceUrl,
      canonicalUrl: candidate.canonicalUrl,
      title: groundedTitle(item.title, candidate),
      quote,
      author: candidate.author,
      publishedAt: candidate.publishedAt,
      engagement: candidate.engagement,
      evidenceKind: item.evidenceKind ?? candidate.evidenceKind,
      repo: candidate.repo,
      ecosystemBoost: candidate.ecosystemBoost,
      sourceReliabilityOverride: candidate.sourceReliabilityOverride,
      raw: candidate.raw,
    });
  }

  return rawSignals;
}

function fallback(
  query: string,
  candidates: EvidenceCandidate[],
  callsAttempted: number,
  failureReason: string
): EvidenceExtractionResult {
  return {
    rawSignals: deterministicExtract(candidates, query),
    callsAttempted,
    mode: "fallback",
    failureReason,
  };
}

function groundedQuote(quote: string, candidate: EvidenceCandidate): string | null {
  const normalized = quote.replace(/\s+/g, " ").trim();
  const haystack = `${candidate.title} ${candidate.snippet} ${candidate.body ?? ""}`
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length >= 20 && haystack.includes(normalized)) {
    return normalized;
  }

  return null;
}

function groundedTitle(title: string, candidate: EvidenceCandidate): string {
  const normalized = title.replace(/\s+/g, " ").trim();
  if (normalized.length >= 4 && candidate.title.includes(normalized)) {
    return normalized;
  }

  return candidate.title;
}
