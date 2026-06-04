import { z } from "zod";
import { deterministicExtract } from "../deterministic-extraction";
import { applyEvidenceQualityGate, isNoiseEvidence } from "../evidence-quality";
import { extractJsonObject } from "../json-utils";
import { getLLMClient } from "../llm/provider";
import { truncateRunEventText } from "../run-events";
import { painTerms, toolTerms } from "../taxonomy";
import { matchedTerms, unique } from "../text";
import type { EvidenceCandidate, RawSignal } from "../types";
import type { EvidenceJudgment } from "./types";

const judgmentSchema = z.object({
  judgments: z.array(
    z.object({
      candidateId: z.string(),
      accepted: z.boolean(),
      quote: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      rationale: z.string().default("Judged against grounded evidence criteria."),
    })
  ),
});

export async function judgeEvidence({
  query,
  candidates,
  maxResults,
  allowLLM,
}: {
  query: string;
  candidates: EvidenceCandidate[];
  maxResults: number;
  allowLLM: boolean;
}): Promise<{
  rawSignals: RawSignal[];
  qualityAccepted: EvidenceCandidate[];
  qualityRejected: EvidenceCandidate[];
  judgments: EvidenceJudgment[];
  mode: "disabled" | "used" | "fallback" | "partial";
  callsAttempted: number;
  failureReason?: string;
}> {
  const postFetchQuality = applyEvidenceQualityGate(candidates, query);
  const promotionalFlagged = postFetchQuality.accepted
    .filter((candidate) => isPromotionalEvidence(candidateText(candidate)))
    .map((candidate) => ({
      ...candidate,
      qualityFlags: unique([...candidate.qualityFlags, "promotional" as const]),
    }));
  const noiseRejected = postFetchQuality.accepted.filter((candidate) =>
    isNoiseEvidence(candidateText(candidate))
  );
  const rejectedIds = new Set([
    ...noiseRejected.map((candidate) => candidate.id),
    ...(!allowLLM ? promotionalFlagged.map((candidate) => candidate.id) : []),
  ]);
  const flaggedById = new Map(
    promotionalFlagged.map((candidate) => [candidate.id, candidate])
  );
  const qualityAccepted = postFetchQuality.accepted
    .filter((candidate) => !rejectedIds.has(candidate.id))
    .map((candidate) => flaggedById.get(candidate.id) ?? candidate);
  const qualityRejected = [
    ...postFetchQuality.rejected,
    ...noiseRejected,
    ...(!allowLLM ? promotionalFlagged : []),
  ];

  if (!allowLLM) {
    return deterministicJudgment({
      query,
      qualityAccepted,
      qualityRejected,
      maxResults,
      mode: "disabled",
      callsAttempted: 0,
    });
  }

  const llm = getLLMClient();
  if (!llm) {
    return deterministicJudgment({
      query,
      qualityAccepted,
      qualityRejected,
      maxResults,
      mode: "fallback",
      callsAttempted: 0,
      failureReason: "No LLM provider configured for evidence judgment.",
    });
  }

  try {
    const response = await llm.client.chat.completions.create({
      model: llm.metadata.model ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are HyperGrowth's evidence judge. Accept only grounded developer-authored pain or workaround evidence. Return strict JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Judge whether each candidate contains actionable developer-pain evidence.",
            query,
            candidates: qualityAccepted.map((candidate) => ({
              id: candidate.id,
              source: candidate.source,
              url: candidate.canonicalUrl,
              title: candidate.title,
              text: truncateRunEventText(candidateText(candidate), 1400),
              evidenceKind: candidate.evidenceKind,
              qualityFlags: candidate.qualityFlags,
            })),
            acceptOnlyIf: [
              "The text contains a concrete developer-authored complaint, failure, workaround, migration issue, tool limitation, production incident, or buying/infra pain.",
              "The quote is copied from the supplied text and can stand alone as evidence.",
              "The evidence maps to browser automation, scraping, anti-bot, session, proxy, extraction, or developer workflow friction.",
            ],
            rejectIf: [
              "The page is a login wall, block wall, network security message, cookie banner, search result UI, home page, navigation chrome, or generic marketing copy.",
              "The text is a job ad, hiring pitch, product launch, vendor self-promotion, sponsorship, or company capability description rather than user pain.",
              "The text merely says Reddit/GitHub/HN blocked access.",
              "The text is a general article with no concrete developer pain or workaround.",
              "The quote is inferred rather than present in the supplied text.",
            ],
            maxAccepted: maxResults,
            outputShape: {
              judgments: [
                {
                  candidateId: "string",
                  accepted: true,
                  quote: "verbatim quote from supplied text",
                  title: "short evidence title",
                  rationale: "why accepted or rejected",
                },
              ],
            },
          }),
        },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("LLM returned empty evidence judgment.");

    const parsed = parseEvidenceJudgmentContent(content);
    const judgments = sanitizeJudgments(parsed.judgments, qualityAccepted);
    const rawSignals = judgmentsToRawSignals({
      judgments,
      candidates: qualityAccepted,
      query,
      maxResults,
    });
    const supplemented = supplementStructuredEvidence({
      rawSignals,
      candidates: qualityAccepted,
      query,
      maxResults,
    });

    return {
      rawSignals: supplemented,
      qualityAccepted,
      qualityRejected,
      judgments,
      mode: rawSignals.length === supplemented.length ? "used" : "partial",
      callsAttempted: 1,
    };
  } catch (error) {
    return deterministicJudgment({
      query,
      qualityAccepted,
      qualityRejected,
      maxResults,
      mode: "fallback",
      callsAttempted: 1,
      failureReason: `Evidence judgment failed: ${error}`,
    });
  }
}

export function parseEvidenceJudgmentContent(
  content: string
): z.infer<typeof judgmentSchema> {
  return judgmentSchema.parse(extractJsonObject(content));
}

function deterministicJudgment({
  query,
  qualityAccepted,
  qualityRejected,
  maxResults,
  mode,
  callsAttempted,
  failureReason,
}: {
  query: string;
  qualityAccepted: EvidenceCandidate[];
  qualityRejected: EvidenceCandidate[];
  maxResults: number;
  mode: "disabled" | "fallback";
  callsAttempted: number;
  failureReason?: string;
}) {
  const credible = qualityAccepted.filter((candidate) =>
    hasDeveloperPainSignal(candidate, query)
  );
  const rawSignals = deterministicExtract(credible, query).slice(0, maxResults);
  const rawIds = new Set(rawSignals.map((signal) => signal.canonicalUrl ?? signal.sourceUrl));
  const judgments: EvidenceJudgment[] = qualityAccepted.map((candidate) => ({
    candidateId: candidate.id,
    accepted: rawIds.has(candidate.canonicalUrl ?? candidate.sourceUrl),
    quote: rawIds.has(candidate.canonicalUrl ?? candidate.sourceUrl)
      ? deterministicExtract([candidate], query)[0]?.quote
      : undefined,
    rationale: rawIds.has(candidate.canonicalUrl ?? candidate.sourceUrl)
      ? "Accepted by deterministic evidence guard."
      : "Rejected by deterministic evidence guard.",
  }));

  return {
    rawSignals,
    qualityAccepted,
    qualityRejected,
    judgments,
    mode,
    callsAttempted,
    failureReason,
  };
}

function sanitizeJudgments(
  judgments: z.infer<typeof judgmentSchema>["judgments"],
  candidates: EvidenceCandidate[]
): EvidenceJudgment[] {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  return judgments
    .filter((judgment) => candidateById.has(judgment.candidateId))
    .map((judgment) => {
      const candidate = candidateById.get(judgment.candidateId);
      const text = candidate ? candidateText(candidate) : "";
      const quote =
        typeof judgment.quote === "string"
          ? judgment.quote.replace(/\s+/g, " ").trim()
          : undefined;
      const quoteMatches =
        typeof quote === "string" &&
        quote.length >= 15 &&
        text.toLowerCase().includes(quote.toLowerCase().slice(0, 40)) &&
        !isNoiseEvidence(quote);
      const accepted =
        judgment.accepted &&
        quoteMatches;

      return {
        ...judgment,
        accepted,
        quote: accepted ? quote : undefined,
        title: typeof judgment.title === "string" ? judgment.title : undefined,
      };
    });
}

function judgmentsToRawSignals({
  judgments,
  candidates,
  query,
  maxResults,
}: {
  judgments: EvidenceJudgment[];
  candidates: EvidenceCandidate[];
  query: string;
  maxResults: number;
}): RawSignal[] {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const signals: RawSignal[] = [];

  for (const judgment of judgments) {
    if (!judgment.accepted || !judgment.quote) continue;
    const candidate = candidateById.get(judgment.candidateId);
    if (!candidate || !hasDeveloperPainSignal(candidate, query)) continue;
    const fallback = deterministicExtract([candidate], query)[0];
    if (!fallback) continue;

    signals.push({
      ...fallback,
      title: judgment.title?.trim() || fallback.title,
      quote: judgment.quote,
    });
    if (signals.length >= maxResults) break;
  }

  return signals;
}

function supplementStructuredEvidence({
  rawSignals,
  candidates,
  query,
  maxResults,
}: {
  rawSignals: RawSignal[];
  candidates: EvidenceCandidate[];
  query: string;
  maxResults: number;
}): RawSignal[] {
  const seen = new Set(rawSignals.map((signal) => signal.canonicalUrl ?? signal.sourceUrl));
  const supplemental = deterministicExtract(
    candidates.filter(
      (candidate) =>
        (candidate.source === "github" || candidate.source === "hackernews") &&
        !seen.has(candidate.canonicalUrl ?? candidate.sourceUrl) &&
        hasDeveloperPainSignal(candidate, query)
    ),
    query
  );

  return [...rawSignals, ...supplemental].slice(0, maxResults);
}

function hasDeveloperPainSignal(candidate: EvidenceCandidate, query: string): boolean {
  const text = candidateText(candidate);
  if (isNoiseEvidence(text)) return false;
  if (isPromotionalEvidence(text)) return false;
  const lower = text.toLowerCase();
  const overlap = matchedTerms(lower, [...toolTerms, ...painTerms, ...tokenizeQuery(query)]);
  const painLanguage =
    /\b(fail|failed|failing|error|bug|broken|blocked|captcha|timeout|unreliable|slow|flaky|workaround|issue|problem|can't|cannot|struggle|pain)\b/i.test(
      text
    );

  return overlap.length > 0 && painLanguage;
}

export function isPromotionalEvidence(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  const lower = compact.toLowerCase();
  const firstPersonVendor =
    /\b(we|our|we're|we are|we built|we focus|we help|we provide|we offer|our platform|our product|our team)\b/i.test(
      compact
    );
  const promoLanguage =
    /\b(hiring|apply|job|role|position|sponsor|sponsored|launching|introducing|announcing|demo|book a call|contact sales|developer advocate|we focus on hard technical problems|captcha-bypassing systems)\b/i.test(
      compact
    );
  const productPitch =
    /\b(all-in-one|end-to-end|platform|solution|service|managed|native captcha|captcha solving service|anti-bot browser automation)\b/i.test(
      compact
    );
  const userPainLanguage =
    /\b(i|i'm|i've|my|we cannot|we can't|we are blocked|we got blocked|doesn't work|not working|fails|failed|flaky|stuck|struggling)\b/i.test(
      compact
    );

  if (/^develop .{0,120}\b(api integration|systems|models|pipelines)\b/i.test(compact)) {
    return true;
  }

  if (firstPersonVendor && (promoLanguage || productPitch) && !userPainLanguage) {
    return true;
  }

  if (lower.includes("we focus on hard technical problems")) {
    return true;
  }

  return false;
}

function candidateText(candidate: EvidenceCandidate): string {
  return `${candidate.title}\n${candidate.snippet}\n${candidate.body ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9+#.-]/g, ""))
    .filter((token) => token.length > 3);
}
