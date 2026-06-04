import { z } from "zod";
import { isNoiseEvidence } from "../evidence-quality";
import { extractJsonObject } from "../json-utils";
import { getLLMClient } from "../llm/provider";
import { truncateRunEventText } from "../run-events";
import {
  categorizePain,
  painTerms,
  toolTerms,
  hyperbrowserFitTerms,
} from "../taxonomy";
import { matchedTerms, tokenize, unique } from "../text";
import type { EvidenceCandidate } from "../types";
import type {
  FetchedDocument,
  PageTriageArtifactSignal,
  PageTriageDecision,
  PageTriageResult,
} from "./types";

const painCategories = [
  "anti_bot_reliability",
  "session_persistence",
  "browser_infra_cost",
  "dynamic_js_extraction",
  "agent_navigation_failure",
  "proxy_retry_complexity",
  "data_quality_extraction",
  "workflow_maintenance",
  "developer_workflow_friction",
] as const;

const artifactSignals = [
  "markdown",
  "links",
  "json",
  "screenshot",
  "branding",
] as const;

const decisionSchema = z.object({
  candidateId: z.string(),
  decision: z.enum(["accept", "reject", "needs_more_context"]),
  evidenceQuote: z.string().nullable().optional(),
  evidenceTitle: z.string().nullable().optional(),
  pageType: z.string().nullable().optional(),
  painCategory: z.enum(painCategories).nullable().optional(),
  hyperbrowserFit: z.number().default(0.5),
  confidence: z.number().default(0.5),
  reasoning: z.array(z.string()).default([]),
  rejectionReason: z.string().nullable().optional(),
  followUpSearches: z.array(z.string()).default([]),
  artifactSignals: z.array(z.enum(artifactSignals)).default([]),
});

const responseSchema = z.object({
  decisions: z.array(decisionSchema),
});

export async function triageFetchedPages({
  query,
  candidates,
  fetchedDocuments,
  maxDecisions,
  allowLLM,
}: {
  query: string;
  candidates: EvidenceCandidate[];
  fetchedDocuments: FetchedDocument[];
  maxDecisions: number;
  allowLLM: boolean;
}): Promise<PageTriageResult> {
  const fetches = fetchedDocuments.filter(
    (document) => document.status === "success"
  );

  if (!fetches.length || maxDecisions <= 0) {
    return {
      decisions: [],
      mode: "disabled",
      callsAttempted: 0,
    };
  }

  if (!allowLLM) {
    return {
      decisions: [],
      mode: "disabled",
      callsAttempted: 0,
    };
  }

  const llm = getLLMClient();
  if (!llm) {
    return {
      decisions: deterministicPageTriage({
        query,
        candidates,
        fetchedDocuments: fetches,
        maxDecisions,
      }),
      mode: "fallback",
      callsAttempted: 0,
      failureReason: "No LLM provider configured for page triage.",
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
            "You triage Hyperbrowser-fetched pages for public developer-pain evidence. Use only supplied artifacts. Return strict JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Decide whether each fetched browser page is usable growth evidence.",
            query,
            pages: buildPagePackets({
              query,
              candidates,
              fetchedDocuments: fetches,
            }),
            acceptOnlyIf: [
              "The page contains concrete developer-authored pain, failure, workaround, bug, incident, migration issue, or infra/workflow friction.",
              "evidenceQuote must be copied from markdownExcerpt or candidate text.",
              "The evidence is relevant to browser automation, scraping, anti-bot reliability, sessions, proxies, dynamic extraction, or developer workflow friction.",
            ],
            rejectIf: [
              "The page is a login wall, block wall, cookie banner, search result UI, navigation chrome, homepage, vendor marketing page, job ad, launch announcement, or generic listicle.",
              "The quote is inferred from the screenshot, branding, or your own summary rather than present in supplied text.",
            ],
            decisionMeanings: {
              accept: "usable evidence with a grounded quote",
              reject: "not usable evidence",
              needs_more_context:
                "promising but needs another source or search before it can become evidence",
            },
            outputShape: {
              decisions: [
                {
                  candidateId: "string",
                  decision: "accept | reject | needs_more_context",
                  evidenceQuote: "verbatim quote when accepted",
                  evidenceTitle: "short title when accepted",
                  pageType: "forum-thread | issue | docs | article | other",
                  painCategory: painCategories[0],
                  hyperbrowserFit: 0.5,
                  confidence: 0.5,
                  reasoning: ["short reason"],
                  rejectionReason: "short reason when rejected",
                  followUpSearches: ["short search query when needed"],
                  artifactSignals: ["markdown", "json"],
                },
              ],
            },
            maxAccepted: maxDecisions,
          }),
        },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("LLM returned empty page triage.");

    return {
      decisions: sanitizePageTriageDecisions({
        candidates,
        fetchedDocuments: fetches,
        decisions: parsePageTriageContent(content).decisions,
      }).slice(0, maxDecisions),
      mode: "used",
      callsAttempted: 1,
    };
  } catch (error) {
    return {
      decisions: deterministicPageTriage({
        query,
        candidates,
        fetchedDocuments: fetches,
        maxDecisions,
      }),
      mode: "fallback",
      callsAttempted: 1,
      failureReason: `Page triage failed: ${error}`,
    };
  }
}

export function parsePageTriageContent(
  content: string
): z.infer<typeof responseSchema> {
  return responseSchema.parse(extractJsonObject(content));
}

export function sanitizePageTriageDecisions({
  candidates,
  fetchedDocuments,
  decisions,
}: {
  candidates: EvidenceCandidate[];
  fetchedDocuments: FetchedDocument[];
  decisions: z.infer<typeof decisionSchema>[];
}): PageTriageDecision[] {
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.id, candidate])
  );
  const documentById = new Map(
    fetchedDocuments.map((document) => [document.candidateId, document])
  );
  const seen = new Set<string>();
  const sanitized: PageTriageDecision[] = [];

  for (const decision of decisions) {
    if (seen.has(decision.candidateId)) continue;
    const candidate = candidateById.get(decision.candidateId);
    const document = documentById.get(decision.candidateId);
    if (!candidate || !document) continue;
    seen.add(decision.candidateId);

    const quote = normalizeOptionalString(decision.evidenceQuote);
    const text = pageText(candidate, document);
    const quoteGrounded =
      quote.length >= 15 &&
      text.toLowerCase().includes(quote.toLowerCase().slice(0, 40)) &&
      !isNoiseEvidence(quote);
    const decisionValue =
      decision.decision === "accept" && !quoteGrounded
        ? "reject"
        : decision.decision;
    const artifactSignalValues = decision.artifactSignals.length
      ? decision.artifactSignals
      : inferArtifactSignals(document);

    sanitized.push({
      candidateId: decision.candidateId,
      decision: decisionValue,
      evidenceQuote: decisionValue === "accept" ? quote : undefined,
      evidenceTitle:
        decisionValue === "accept"
          ? normalizeOptionalString(decision.evidenceTitle)
          : undefined,
      pageType: normalizeOptionalString(decision.pageType),
      painCategory:
        decision.painCategory ?? categorizePain(`${candidate.title} ${text}`),
      hyperbrowserFit: clampScore(decision.hyperbrowserFit),
      confidence: clampScore(decision.confidence),
      reasoning: normalizeStrings([
        ...decision.reasoning,
        ...(decision.decision === "accept" && !quoteGrounded
          ? ["Accepted quote was not grounded in fetched page text."]
          : []),
      ]).slice(0, 3),
      rejectionReason:
        decisionValue === "reject"
          ? normalizeOptionalString(decision.rejectionReason) ||
            (decision.decision === "accept"
              ? "Accepted quote was not grounded in fetched page text."
              : "Rejected by page triage.")
          : undefined,
      followUpSearches: normalizeStrings(decision.followUpSearches).slice(0, 3),
      artifactSignals: unique(artifactSignalValues) as PageTriageArtifactSignal[],
    });
  }

  return sanitized;
}

function deterministicPageTriage({
  query,
  candidates,
  fetchedDocuments,
  maxDecisions,
}: {
  query: string;
  candidates: EvidenceCandidate[];
  fetchedDocuments: FetchedDocument[];
  maxDecisions: number;
}): PageTriageDecision[] {
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.id, candidate])
  );

  return fetchedDocuments.slice(0, maxDecisions).flatMap((document) => {
    const candidate = candidateById.get(document.candidateId);
    if (!candidate) return [];
    const text = pageText(candidate, document);
    const usefulTerms = matchedTerms(text.toLowerCase(), [
      ...toolTerms,
      ...painTerms,
      ...tokenize(query),
    ]);
    const quote = bestEvidenceQuote(document.markdown, candidate.snippet);
    const hasPainLanguage =
      /\b(fail|failed|failing|error|bug|broken|blocked|captcha|timeout|unreliable|slow|flaky|workaround|issue|problem|can't|cannot|struggle|pain)\b/i.test(
        text
      );
    const accepted =
      usefulTerms.length > 0 &&
      hasPainLanguage &&
      quote.length >= 15 &&
      !isNoiseEvidence(text);

    return [
      {
        candidateId: document.candidateId,
        decision: accepted ? "accept" : "reject",
        evidenceQuote: accepted ? quote : undefined,
        evidenceTitle: accepted ? candidate.title : undefined,
        pageType: document.pageSummary?.pageType ?? candidate.evidenceKind,
        painCategory: categorizePain(text),
        hyperbrowserFit: hyperbrowserFit(text),
        confidence: accepted ? 0.62 : 0.48,
        reasoning: [
          accepted
            ? "Deterministic fallback found tool and pain language in fetched text."
            : "Deterministic fallback did not find enough grounded pain evidence.",
        ],
        rejectionReason: accepted
          ? undefined
          : "Insufficient grounded developer-pain evidence.",
        followUpSearches: [],
        artifactSignals: inferArtifactSignals(document),
      } satisfies PageTriageDecision,
    ];
  });
}

function buildPagePackets({
  query,
  candidates,
  fetchedDocuments,
}: {
  query: string;
  candidates: EvidenceCandidate[];
  fetchedDocuments: FetchedDocument[];
}) {
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.id, candidate])
  );

  return fetchedDocuments.flatMap((document) => {
    const candidate = candidateById.get(document.candidateId);
    if (!candidate) return [];

    return [
      {
        candidateId: document.candidateId,
        url: document.url,
        candidateTitle: candidate.title,
        candidateSnippet: truncateRunEventText(candidate.snippet, 420),
        metadataTitle: document.metadataTitle,
        metadataDescription: document.metadataDescription,
        markdownExcerpt: truncateRunEventText(document.markdown, 1800),
        linksSample: (document.links ?? []).slice(0, 8),
        pageSummary: document.pageSummary,
        brandingSummary: document.branding
          ? {
              colorScheme: document.branding.colorScheme,
              tone: document.branding.tone,
              confidence: document.branding.confidence,
            }
          : undefined,
        screenshotPresent: Boolean(document.screenshot),
        screenshotByteLength: document.screenshot?.byteLength,
        outputFormats: document.outputFormats,
        qualityFlags: candidate.qualityFlags,
        query,
      },
    ];
  });
}

function inferArtifactSignals(
  document: FetchedDocument
): PageTriageArtifactSignal[] {
  const signals: PageTriageArtifactSignal[] = [];
  if (document.markdown) signals.push("markdown");
  if (document.links?.length) signals.push("links");
  if (document.pageSummary) signals.push("json");
  if (document.screenshot) signals.push("screenshot");
  if (document.branding) signals.push("branding");
  return signals.length ? signals : ["markdown"];
}

function pageText(
  candidate: EvidenceCandidate,
  document: FetchedDocument
): string {
  return [
    candidate.title,
    candidate.snippet,
    candidate.body ?? "",
    document.metadataTitle ?? "",
    document.metadataDescription ?? "",
    document.pageSummary?.evidenceValue ?? "",
    ...(document.pageSummary?.painSignals ?? []),
    document.markdown,
  ]
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

function bestEvidenceQuote(markdown: string, fallback: string): string {
  const sentences = markdown
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 260);

  return sentences[0] ?? truncateRunEventText(fallback, 220);
}

function hyperbrowserFit(text: string): number {
  const matches = matchedTerms(text.toLowerCase(), hyperbrowserFitTerms);
  return Math.max(0.35, Math.min(0.95, 0.35 + matches.length * 0.12));
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeStrings(values: unknown[]): string[] {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}
