import { describe, expect, it } from "vitest";
import { synthesizeSignals } from "../synthesis";
import type { GrowthPlay, PainCluster, PainSignal, SignalScore } from "../types";

describe("synthesizeSignals", () => {
  it("reports deterministic mode when growth plays are built without an LLM call", async () => {
    const signal = buildSignal();
    const play: GrowthPlay = {
      id: "play-1",
      channel: "content",
      title: "Technical content on anti-bot reliability",
      insight: "Developers are blocked by CAPTCHA failures.",
      recommendedAction: "Publish a teardown.",
      copyDraft: "Browser automation fails on the real web.",
      supportingSignalIds: [signal.id],
    };
    const result = await synthesizeSignals(
      {
        query: "captcha browser automation",
        signals: [signal],
        signalScores: [buildScore(signal.id)],
        clusters: [buildCluster(signal.id)],
        candidatePlays: [play],
      },
      { allowLLM: false }
    );

    expect(result.mode).toBe("deterministic");
    expect(result.growthPlays).toEqual([play]);
  });
});

function buildSignal(): PainSignal {
  return {
    id: "signal-1",
    source: "hyperbrowser",
    sourceUrl: "https://example.com/source",
    canonicalUrl: "https://example.com/source",
    title: "Playwright CAPTCHA failure",
    url: "https://example.com/source",
    quote:
      "When I run the browser automation headless, the website blocks it with a CAPTCHA.",
    extractedAt: "2026-01-01T00:00:00.000Z",
    evidenceKind: "forum-thread",
    matchedTerms: ["captcha", "browser"],
    toolsMentioned: ["Playwright"],
    painCategory: "anti_bot_reliability",
    urgency: "high",
  };
}

function buildCluster(signalId: string): PainCluster {
  return {
    id: "cluster-1",
    title: "Anti-bot reliability",
    summary: "Browser automation breaks on real anti-bot systems.",
    frequency: 1,
    urgency: "high",
    representativeQuotes: [
      "When I run the browser automation headless, the website blocks it with a CAPTCHA.",
    ],
    relatedTools: ["Playwright"],
    signalIds: [signalId],
  };
}

function buildScore(signalId: string): SignalScore {
  return {
    signalId,
    relevance: 0.8,
    painIntensity: 0.8,
    commercialIntent: 0.6,
    hyperbrowserFit: 0.9,
    recency: 0.8,
    sourceReliability: 0.7,
    confidence: 0.8,
    total: 0.78,
    reasons: ["Relevant CAPTCHA pain"],
  };
}
