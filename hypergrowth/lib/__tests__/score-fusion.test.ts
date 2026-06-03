import { describe, expect, it } from "vitest";
import { fuseLLMJudgments } from "../score-fusion";
import type { LLMJudgment, PainSignal, SignalScore } from "../types";

describe("fuseLLMJudgments", () => {
  it("uses dimension-specific fusion and refines category plus quote", () => {
    const signal = makeSignal();
    const score = makeScore();
    const judgment: LLMJudgment = {
      signalId: "signal-1",
      isActionable: true,
      contextualRelevance: 0.9,
      impliedPainIntensity: 0.8,
      impliedCommercialIntent: 0.7,
      hyperbrowserFit: 0.95,
      confidence: 0.75,
      category: "anti_bot_reliability",
      representativeQuote:
        "Cloudflare keeps blocking our Playwright scripts in production.",
      reasoning: ["Specific production anti-bot failure"],
    };

    const fused = fuseLLMJudgments({
      signals: [signal],
      scores: [score],
      judgments: [judgment],
    });

    expect(fused.signals[0].painCategory).toBe("anti_bot_reliability");
    expect(fused.signals[0].quote).toBe(judgment.representativeQuote);
    expect(fused.scores[0].relevance).toBe(0.81);
    expect(fused.scores[0].painIntensity).toBe(0.71);
    expect(fused.scores[0].commercialIntent).toBe(0.602);
    expect(fused.scores[0].hyperbrowserFit).toBe(0.837);
    expect(fused.scores[0].reasons).toContain(
      "LLM: Specific production anti-bot failure"
    );
  });

  it("caps non-actionable evidence below the normal ranking threshold", () => {
    const fused = fuseLLMJudgments({
      signals: [makeSignal()],
      scores: [{ ...makeScore(), total: 0.9 }],
      judgments: [
        {
          signalId: "signal-1",
          isActionable: false,
          contextualRelevance: 0.9,
          impliedPainIntensity: 0.8,
          impliedCommercialIntent: 0.7,
          hyperbrowserFit: 0.95,
          confidence: 0.75,
          category: "developer_workflow_friction",
          representativeQuote:
            "Cloudflare keeps blocking our Playwright scripts in production.",
          reasoning: [],
        },
      ],
    });

    expect(fused.scores[0].total).toBe(0.25);
    expect(fused.scores[0].reasons).toContain("LLM: marked as not actionable");
  });
});

function makeSignal(): PainSignal {
  return {
    id: "signal-1",
    source: "github",
    sourceUrl: "https://github.com/microsoft/playwright/issues/1",
    canonicalUrl: "https://github.com/microsoft/playwright/issues/1",
    title: "Production browser automation failure",
    url: "https://github.com/microsoft/playwright/issues/1",
    quote: "Cloudflare keeps blocking our Playwright scripts in production.",
    extractedAt: "2026-06-02T00:00:00.000Z",
    matchedTerms: ["cloudflare", "playwright", "production"],
    toolsMentioned: ["Playwright", "Cloudflare"],
    painCategory: "developer_workflow_friction",
    urgency: "high",
  };
}

function makeScore(): SignalScore {
  return {
    signalId: "signal-1",
    relevance: 0.55,
    painIntensity: 0.6,
    commercialIntent: 0.42,
    hyperbrowserFit: 0.7,
    recency: 0.5,
    sourceReliability: 0.86,
    confidence: 0.7,
    total: 0.65,
    reasons: ["heuristic reason"],
  };
}
