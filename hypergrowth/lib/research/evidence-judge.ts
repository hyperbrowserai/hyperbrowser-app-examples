import { z } from "zod";
import { deterministicExtract } from "../deterministic-extraction";
import { applyEvidenceQualityGate, isNoiseEvidence } from "../evidence-quality";
import { extractJsonObject } from "../json-utils";
import { getLLMClient } from "../llm/provider";
import { truncateRunEventText } from "../run-events";
import { painTerms, toolTerms } from "../taxonomy";
import { matchedTerms, unique } from "../text";
import type { EvidenceCandidate, EvidenceQualityFlag, RawSignal } from "../types";
import type { EvidenceJudgment, PageTriageDecision } from "./types";

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
  pageTriageDecisions = [],
  maxResults,
  allowLLM,
}: {
  query: string;
  candidates: EvidenceCandidate[];
  pageTriageDecisions?: PageTriageDecision[];
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
  const pageTriageById = new Map(
    pageTriageDecisions.map((decision) => [decision.candidateId, decision])
  );
  const pageTriageRejected = postFetchQuality.accepted
    .filter((candidate) => {
      const decision = pageTriageById.get(candidate.id);
      return (
        decision?.decision === "reject" ||
        decision?.decision === "needs_more_context"
      );
    })
    .map((candidate) => {
      const decision = pageTriageById.get(candidate.id);
      const flag: EvidenceQualityFlag =
        decision?.decision === "needs_more_context"
          ? "needs_more_context"
          : "llm_rejected";

      return {
        ...candidate,
        qualityFlags: unique([...candidate.qualityFlags, flag]),
      };
    });
  const rejectedIds = new Set([
    ...noiseRejected.map((candidate) => candidate.id),
    ...pageTriageRejected.map((candidate) => candidate.id),
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
    ...pageTriageRejected,
    ...(!allowLLM ? promotionalFlagged : []),
  ];

  if (!allowLLM) {
    return deterministicJudgment({
      query,
      qualityAccepted,
      qualityRejected,
      pageTriageDecisions,
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
      pageTriageDecisions,
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
      maxResults,
    });
    const withPageTriageSignals = supplementPageTriageEvidence({
      rawSignals,
      candidates: qualityAccepted,
      pageTriageDecisions,
      maxResults,
    });

    return {
      rawSignals: withPageTriageSignals,
      qualityAccepted,
      qualityRejected,
      judgments,
      mode: rawSignals.length === withPageTriageSignals.length ? "used" : "partial",
      callsAttempted: 1,
    };
  } catch (error) {
    return deterministicJudgment({
      query,
      qualityAccepted,
      qualityRejected,
      pageTriageDecisions,
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
  pageTriageDecisions,
  maxResults,
  mode,
  callsAttempted,
  failureReason,
}: {
  query: string;
  qualityAccepted: EvidenceCandidate[];
  qualityRejected: EvidenceCandidate[];
  pageTriageDecisions: PageTriageDecision[];
  maxResults: number;
  mode: "disabled" | "fallback";
  callsAttempted: number;
  failureReason?: string;
}) {
  const credible = qualityAccepted.filter((candidate) =>
    hasDeveloperPainSignal(candidate, query)
  );
  const rawSignals = supplementPageTriageEvidence({
    rawSignals: deterministicExtract(credible, query).slice(0, maxResults),
    candidates: qualityAccepted,
    pageTriageDecisions,
    maxResults,
  });
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
  maxResults,
}: {
  judgments: EvidenceJudgment[];
  candidates: EvidenceCandidate[];
  maxResults: number;
}): RawSignal[] {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const signals: RawSignal[] = [];

  for (const judgment of judgments) {
    if (!judgment.accepted || !judgment.quote) continue;
    const candidate = candidateById.get(judgment.candidateId);
    if (!candidate) continue;

    signals.push({
      source: candidate.source,
      sourceUrl: candidate.sourceUrl,
      canonicalUrl: candidate.canonicalUrl,
      title: judgment.title?.trim() || candidate.title,
      quote: judgment.quote,
      author: candidate.author,
      publishedAt: candidate.publishedAt,
      engagement: candidate.engagement,
      evidenceKind: candidate.evidenceKind ?? "web-page",
      repo: candidate.repo,
      raw: candidate.raw,
    });
    if (signals.length >= maxResults) break;
  }

  return signals;
}

function supplementPageTriageEvidence({
  rawSignals,
  candidates,
  pageTriageDecisions,
  maxResults,
}: {
  rawSignals: RawSignal[];
  candidates: EvidenceCandidate[];
  pageTriageDecisions: PageTriageDecision[];
  maxResults: number;
}): RawSignal[] {
  const seen = new Set(
    rawSignals.map((signal) => signal.canonicalUrl ?? signal.sourceUrl)
  );
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.id, candidate])
  );
  const supplemental: RawSignal[] = [];

  for (const decision of pageTriageDecisions) {
    if (decision.decision !== "accept" || !decision.evidenceQuote) continue;
    const candidate = candidateById.get(decision.candidateId);
    if (!candidate) continue;
    const url = candidate.canonicalUrl ?? candidate.sourceUrl;
    if (seen.has(url)) continue;

    supplemental.push({
      source: candidate.source,
      sourceUrl: candidate.sourceUrl,
      canonicalUrl: candidate.canonicalUrl,
      title: decision.evidenceTitle?.trim() || candidate.title,
      quote: decision.evidenceQuote,
      author: candidate.author,
      publishedAt: candidate.publishedAt,
      engagement: candidate.engagement,
      evidenceKind: candidate.evidenceKind ?? "web-page",
      repo: candidate.repo,
      raw: candidate.raw,
      sourceReliabilityOverride:
        typeof decision.confidence === "number"
          ? decision.confidence
          : candidate.sourceReliabilityOverride,
    });
    seen.add(url);
    if (rawSignals.length + supplemental.length >= maxResults) break;
  }

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
    /\b(all-in-one|end-to-end)\b/i.test(
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
