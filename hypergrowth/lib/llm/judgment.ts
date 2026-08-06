import { z } from "zod";
import { extractJsonObject } from "../json-utils";
import { isLLMTransportError } from "./errors";
import { getLLMClient, withReasoningEffort } from "./provider";
import type { LLMJudgment, PainSignal, SignalScore } from "../types";

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

const judgmentSchema = z.object({
  signalId: z.string(),
  isActionable: z.boolean(),
  contextualRelevance: z.number(),
  impliedPainIntensity: z.number(),
  impliedCommercialIntent: z.number(),
  hyperbrowserFit: z.number(),
  confidence: z.number(),
  category: z.enum(painCategories),
  representativeQuote: z.string(),
  reasoning: z.array(z.string()).default([]),
});

const responseSchema = z.object({
  judgments: z.array(judgmentSchema),
});

type JudgeSignalsResult = {
  judgments: LLMJudgment[];
  callsAttempted: number;
  mode: "disabled" | "used" | "fallback" | "partial";
  failureReason?: string;
};

const judgmentBatchSize = 10;

export async function judgeSignals({
  query,
  signals,
  signalScores,
  maxCalls = Number.POSITIVE_INFINITY,
}: {
  query: string;
  signals: PainSignal[];
  signalScores: SignalScore[];
  maxCalls?: number;
}): Promise<JudgeSignalsResult> {
  if (signals.length === 0) {
    return { judgments: [], callsAttempted: 0, mode: "disabled" };
  }

  const llm = getLLMClient();
  if (!llm) {
    return {
      judgments: [],
      callsAttempted: 0,
      mode: "disabled",
      failureReason: "No LLM provider configured for judgment.",
    };
  }

  if (maxCalls <= 0) {
    return {
      judgments: [],
      callsAttempted: 0,
      mode: "fallback",
      failureReason: "LLM judgment skipped because the call budget is exhausted.",
    };
  }

  let callsAttempted = 0;
  const judgments: LLMJudgment[] = [];
  const failures: string[] = [];

  for (let index = 0; index < signals.length; index += judgmentBatchSize) {
    const batch = signals.slice(index, index + judgmentBatchSize);
    const batchScores = signalScores.filter((score) =>
      batch.some((signal) => signal.id === score.signalId)
    );

    if (callsAttempted >= maxCalls) {
      failures.push("LLM judgment stopped because the call budget was exhausted.");
      break;
    }

    try {
      callsAttempted += 1;
      judgments.push(
        ...(await requestJudgments({
          query,
          signals: batch,
          signalScores: batchScores,
        }))
      );
      continue;
    } catch (firstError) {
      if (isLLMTransportError(firstError)) {
        failures.push(`LLM judgment transport failed: ${firstError}`);
        continue;
      }

      if (callsAttempted >= maxCalls) {
        failures.push(`LLM judgment repair skipped after failure: ${firstError}`);
        continue;
      }

      try {
        callsAttempted += 1;
        judgments.push(
          ...(await requestJudgments({
            query,
            signals: batch,
            signalScores: batchScores,
            repairInput: String(firstError),
          }))
        );
      } catch (repairError) {
        failures.push(`LLM judgment failed after repair: ${repairError}`);
      }
    }
  }

  const mode =
    judgments.length === signals.length
      ? "used"
      : judgments.length > 0
        ? "partial"
        : "fallback";

  return {
    judgments,
    callsAttempted,
    mode,
    failureReason: failures.length ? failures.join(" | ") : undefined,
  };
}

async function requestJudgments({
  query,
  signals,
  signalScores,
  repairInput,
}: {
  query: string;
  signals: PainSignal[];
  signalScores: SignalScore[];
  repairInput?: string;
}): Promise<LLMJudgment[]> {
  const llm = getLLMClient();
  if (!llm) throw new Error("No LLM provider configured.");

  const response = await llm.client.chat.completions.create(
    withReasoningEffort({
      model: llm.metadata.model ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You judge public developer pain evidence for HyperGrowth, a Hyperbrowser-specific growth signal miner. Use only supplied evidence. Return strict JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: repairInput
              ? "Repair the previous judgment failure and return valid JSON."
              : "Judge whether these public evidence items are actionable growth signals.",
            previousFailure: repairInput,
            query,
            constraints: [
              "Every signalId must match one provided signal.",
              "All numeric scores must be between 0 and 1.",
              "representativeQuote must be grounded in the original title or quote.",
              "Do not invent companies, people, URLs, or private intent.",
              "Use isActionable=false for generic, ambiguous, or off-topic evidence.",
              "You are the final scoring authority for these signals; deterministic scores are diagnostic context only.",
            ],
            categories: painCategories,
            shape: {
              judgments: [
                {
                  signalId: "string",
                  isActionable: true,
                  contextualRelevance: 0.5,
                  impliedPainIntensity: 0.5,
                  impliedCommercialIntent: 0.5,
                  hyperbrowserFit: 0.5,
                  confidence: 0.5,
                  category: "developer_workflow_friction",
                  representativeQuote: "string",
                  reasoning: ["string"],
                },
              ],
            },
            signals: buildJudgmentInputs(signals, signalScores),
          }),
        },
      ],
    })
  );

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("LLM returned empty judgments.");

  const parsed = responseSchema.parse(extractJsonObject(content));
  return validateJudgments(parsed.judgments, signals);
}

function validateJudgments(
  judgments: z.infer<typeof judgmentSchema>[],
  signals: PainSignal[]
): LLMJudgment[] {
  const signalById = new Map(signals.map((signal) => [signal.id, signal]));
  const valid: LLMJudgment[] = [];

  for (const judgment of judgments) {
    const signal = signalById.get(judgment.signalId);
    if (!signal) continue;

    valid.push({
      signalId: judgment.signalId,
      isActionable: judgment.isActionable,
      contextualRelevance: clampJudgment(judgment.contextualRelevance),
      impliedPainIntensity: clampJudgment(judgment.impliedPainIntensity),
      impliedCommercialIntent: clampJudgment(judgment.impliedCommercialIntent),
      hyperbrowserFit: clampJudgment(judgment.hyperbrowserFit),
      confidence: clampJudgment(judgment.confidence),
      category: judgment.category,
      representativeQuote: groundedQuote(judgment.representativeQuote, signal),
      reasoning: judgment.reasoning
        .filter((reason) => typeof reason === "string")
        .map((reason) => reason.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 3),
    });
  }

  return valid;
}

function buildJudgmentInputs(
  signals: PainSignal[],
  signalScores: SignalScore[]
) {
  const scoreBySignalId = new Map(
    signalScores.map((score) => [score.signalId, score])
  );

  return signals.map((signal) => ({
    id: signal.id,
    source: signal.source,
    title: signal.title,
    url: signal.url,
    canonicalUrl: signal.canonicalUrl,
    quote: signal.quote,
    publishedAt: signal.publishedAt,
    evidenceKind: signal.evidenceKind,
    matchedTerms: signal.matchedTerms,
    toolsMentioned: signal.toolsMentioned,
    painCategory: signal.painCategory,
    urgency: signal.urgency,
    sourceReliabilityOverride: signal.sourceReliabilityOverride,
    deterministicScore: scoreBySignalId.get(signal.id),
  }));
}

function groundedQuote(quote: string, signal: PainSignal): string {
  const normalized = quote.replace(/\s+/g, " ").trim();
  const haystack = `${signal.title} ${signal.quote}`.replace(/\s+/g, " ");

  if (normalized.length >= 20 && haystack.includes(normalized)) {
    return normalized;
  }

  return signal.quote;
}

function clampJudgment(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}
