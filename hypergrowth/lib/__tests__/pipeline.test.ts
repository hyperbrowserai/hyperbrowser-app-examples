import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMJudgment, LLMUsageMetadata, PainSignal } from "../types";

const judgeSignalsMock = vi.hoisted(() => vi.fn());

vi.mock("../llm/judgment", () => ({
  judgeSignals: judgeSignalsMock,
}));

import { runSignalPipeline } from "../pipeline";

describe("runSignalPipeline", () => {
  beforeEach(() => {
    judgeSignalsMock.mockReset();
  });

  it("does not call the LLM judge in deterministic mode", async () => {
    const result = await runSignalPipeline(
      "browser automation failures",
      [makeSignal("signal-1")],
      {
        effectiveAnalysisMode: "deterministic",
        allowJudgment: false,
        allowSynthesis: false,
        maxLLMCalls: 0,
        llm: makeLLMUsage(),
      }
    );

    expect(judgeSignalsMock).not.toHaveBeenCalled();
    expect(result.llmJudgments).toEqual([]);
    expect(result.llm.judgmentMode).toBe("disabled");
  });

  it("sends every deduped signal to the LLM judge in full mode", async () => {
    judgeSignalsMock.mockResolvedValue({
      judgments: [
        makeJudgment("low-lexical", {
          contextualRelevance: 0.92,
          impliedPainIntensity: 0.86,
          impliedCommercialIntent: 0.72,
          hyperbrowserFit: 0.94,
          confidence: 0.82,
        }),
        makeJudgment("clear-lexical"),
      ],
      callsAttempted: 1,
      mode: "used",
    });

    const result = await runSignalPipeline(
      "Hyperbrowser authenticated browser workflow reliability",
      [
        makeSignal(
          "low-lexical",
          "Every morning someone has to babysit this crawler before customers see stale data."
        ),
        makeSignal(
          "clear-lexical",
          "Our browser automation workflow keeps failing in production."
        ),
      ],
      {
        effectiveAnalysisMode: "full",
        allowJudgment: true,
        allowSynthesis: false,
        maxLLMCalls: 12,
        llm: makeLLMUsage(),
      }
    );

    expect(judgeSignalsMock).toHaveBeenCalledOnce();
    expect(
      judgeSignalsMock.mock.calls[0][0].signals.map(
        (signal: PainSignal) => signal.id
      )
    ).toEqual(["clear-lexical", "low-lexical"]);
    expect(result.llmJudgments).toHaveLength(2);
    expect(
      result.signalScores.find((score) => score.signalId === "low-lexical")
        ?.total
    ).toBeGreaterThan(0.75);
  });

  it("keeps deterministic fallback scores for signals missing from partial judgment", async () => {
    judgeSignalsMock.mockResolvedValue({
      judgments: [makeJudgment("judged")],
      callsAttempted: 1,
      mode: "partial",
      failureReason: "LLM judgment failed after repair",
    });

    const result = await runSignalPipeline(
      "browser automation failures",
      [
        makeSignal("judged"),
        makeSignal(
          "fallback",
          "The extractor breaks on dynamic JavaScript pages, so the team keeps rebuilding brittle parsing rules."
        ),
      ],
      {
        effectiveAnalysisMode: "full",
        allowJudgment: true,
        allowSynthesis: false,
        maxLLMCalls: 12,
        llm: makeLLMUsage(),
      }
    );

    expect(result.llm.judgmentMode).toBe("partial");
    expect(
      result.signalScores.find((score) => score.signalId === "fallback")
        ?.reasons
    ).toContain(
        "LLM: deterministic fallback (LLM judgment failed after repair)"
      );
  });
});

function makeSignal(
  id: string,
  quote = "This browser automation workflow keeps failing in production and needs reliable infrastructure."
): PainSignal {
  return {
    id,
    source: "github",
    sourceUrl: `https://github.com/example/repo/issues/${id}`,
    canonicalUrl: `https://github.com/example/repo/issues/${id}`,
    title: id,
    url: `https://github.com/example/repo/issues/${id}`,
    quote,
    extractedAt: "2026-06-02T00:00:00.000Z",
    matchedTerms: ["browser", "failing", "production"],
    toolsMentioned: ["Playwright"],
    painCategory: "developer_workflow_friction",
    urgency: "high",
  };
}

function makeJudgment(
  signalId: string,
  scores: Partial<
    Pick<
      LLMJudgment,
      | "contextualRelevance"
      | "impliedPainIntensity"
      | "impliedCommercialIntent"
      | "hyperbrowserFit"
      | "confidence"
    >
  > = {}
): LLMJudgment {
  return {
    signalId,
    isActionable: true,
    contextualRelevance: scores.contextualRelevance ?? 0.8,
    impliedPainIntensity: scores.impliedPainIntensity ?? 0.8,
    impliedCommercialIntent: scores.impliedCommercialIntent ?? 0.65,
    hyperbrowserFit: scores.hyperbrowserFit ?? 0.8,
    confidence: scores.confidence ?? 0.75,
    category: "developer_workflow_friction",
    representativeQuote:
      "This browser automation workflow keeps failing in production and needs reliable infrastructure.",
    reasoning: ["Useful Hyperbrowser growth signal"],
  };
}

function makeLLMUsage(): LLMUsageMetadata {
  return {
    queryExpansionMode: "deterministic",
    candidateTriageMode: "deterministic",
    pageTriageMode: "deterministic",
    evidenceExtractionMode: "disabled",
    gapExpansionMode: "deterministic",
    judgmentMode: "disabled",
    synthesisMode: "deterministic",
    callsAttempted: 0,
  };
}
