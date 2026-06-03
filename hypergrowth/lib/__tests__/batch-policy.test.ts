import { describe, expect, it } from "vitest";
import { selectJudgmentBatch } from "../llm/batch-policy";
import type { PainSignal, SignalScore } from "../types";

describe("selectJudgmentBatch", () => {
  it("selects high, borderline, and missing-source filler signals", () => {
    const signals = [
      makeSignal("high-1", "github"),
      makeSignal("borderline-1", "github"),
      makeSignal("filler-1", "reddit"),
      makeSignal("low-1", "github"),
    ];
    const scores = [
      makeScore("high-1", 0.9),
      makeScore("borderline-1", 0.5),
      makeScore("filler-1", 0.2),
      makeScore("low-1", 0.1),
    ];

    const selected = selectJudgmentBatch(signals, scores).map((signal) => signal.id);

    expect(selected).toEqual(["high-1", "borderline-1", "filler-1"]);
  });
});

function makeSignal(id: string, source: PainSignal["source"]): PainSignal {
  return {
    id,
    source,
    sourceUrl: `https://example.com/${id}`,
    canonicalUrl: `https://example.com/${id}`,
    title: id,
    url: `https://example.com/${id}`,
    quote:
      "This browser automation workflow keeps failing in production and needs reliable infrastructure.",
    extractedAt: "2026-06-02T00:00:00.000Z",
    matchedTerms: ["browser", "failing", "production"],
    toolsMentioned: ["Playwright"],
    painCategory: "developer_workflow_friction",
    urgency: "high",
  };
}

function makeScore(signalId: string, total: number): SignalScore {
  return {
    signalId,
    relevance: total,
    painIntensity: total,
    commercialIntent: total,
    hyperbrowserFit: total,
    recency: total,
    sourceReliability: total,
    confidence: total,
    total,
    reasons: [],
  };
}
