import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResearchFeedback } from "../research/types";

const completionCreateMock = vi.hoisted(() => vi.fn());
const originalEnableReasoning = process.env.ENABLE_REASONING;
const originalReasoningLevel = process.env.REASONING_LEVEL;

vi.mock("../llm/provider", () => ({
  getLLMClient: () => ({
    metadata: {
      provider: "test",
      model: "test-model",
    },
    client: {
      chat: {
        completions: {
          create: completionCreateMock,
        },
      },
    },
  }),
  withReasoningEffort: (params: Record<string, unknown>) => {
    const enabled = ["true", "1", "yes", "on"].includes(
      (process.env.ENABLE_REASONING ?? "").trim().toLowerCase()
    );
    if (!enabled) return params;

    const configured = (process.env.REASONING_LEVEL ?? "medium")
      .trim()
      .toLowerCase();
    const effort =
      configured === "low" || configured === "medium" || configured === "high"
        ? configured
        : "medium";

    return {
      ...params,
      reasoning_effort: effort,
    };
  },
}));

import { createGapExpansionSearches } from "../research/planner";

describe("research feedback routing", () => {
  beforeEach(() => {
    completionCreateMock.mockReset();
    delete process.env.ENABLE_REASONING;
    delete process.env.REASONING_LEVEL;
  });

  afterEach(() => {
    if (originalEnableReasoning === undefined) {
      delete process.env.ENABLE_REASONING;
    } else {
      process.env.ENABLE_REASONING = originalEnableReasoning;
    }

    if (originalReasoningLevel === undefined) {
      delete process.env.REASONING_LEVEL;
    } else {
      process.env.REASONING_LEVEL = originalReasoningLevel;
    }
  });

  it("passes page-triage feedback into gap expansion and filters repeated searches", async () => {
    completionCreateMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              rationale: ["Use page triage feedback to disambiguate automation."],
              searches: [
                {
                  source: "hyperbrowser",
                  query: "browser agents",
                  rationale: "Duplicate should be filtered.",
                },
                {
                  source: "hyperbrowser",
                  query: "playwright automation cloudflare issue",
                  rationale: "Specific follow-up from page triage.",
                },
              ],
            }),
          },
        },
      ],
    });

    const feedback: ResearchFeedback[] = [
      {
        summary: ["Repeated rejection: about browser extensions, not automation."],
        rejectedPages: [
          {
            candidateId: "candidate-1",
            source: "hyperbrowser",
            title: "Best browser extensions for agents",
            url: "https://example.com/extensions",
            originalSearchQuery: "browser agents",
            rejectionReason:
              "The result is about browser extensions, not browser automation.",
            pageType: "article",
            confidence: 0.91,
            reasoning: ["Semantic drift away from automation."],
            followUpSearches: ["playwright automation cloudflare issue"],
          },
        ],
        suggestedSearches: ["playwright automation cloudflare issue"],
      },
    ];

    const result = await createGapExpansionSearches({
      query: "browser agents",
      selectedSources: ["hyperbrowser"],
      openWebTargets: { includeBroadWeb: true, redditSubreddits: [] },
      executedSearches: [
        {
          source: "hyperbrowser",
          query: "browser agents",
          reason: "expanded",
          rationale: "Previously executed search.",
        },
      ],
      acceptedEvidence: [],
      rejectedCandidates: [],
      researchFeedback: feedback,
      remainingLLMCalls: 1,
    });

    const prompt = JSON.parse(
      completionCreateMock.mock.calls[0][0].messages[1].content
    );

    expect(prompt.researchFeedback.rejectedPages[0]).toMatchObject({
      rejectionReason:
        "The result is about browser extensions, not browser automation.",
      originalSearchQuery: "browser agents",
      followUpSearches: ["playwright automation cloudflare issue"],
    });
    expect(prompt.researchFeedback.suggestedSearches).toEqual([
      "playwright automation cloudflare issue",
    ]);
    expect(completionCreateMock.mock.calls[0][0]).not.toHaveProperty(
      "reasoning_effort"
    );
    expect(result.searches.map((search) => search.query)).toEqual([
      "playwright automation cloudflare issue",
    ]);
  });

  it("passes reasoning effort through gap expansion requests when enabled", async () => {
    process.env.ENABLE_REASONING = "true";
    process.env.REASONING_LEVEL = "high";
    completionCreateMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              rationale: ["Use a more specific browser automation query."],
              searches: [
                {
                  source: "hyperbrowser",
                  query: "playwright captcha automation issue",
                  rationale: "Specific enough for Hyperbrowser open-web search.",
                },
              ],
            }),
          },
        },
      ],
    });

    await createGapExpansionSearches({
      query: "browser automation captcha",
      selectedSources: ["hyperbrowser"],
      openWebTargets: { includeBroadWeb: true, redditSubreddits: [] },
      executedSearches: [],
      acceptedEvidence: [],
      rejectedCandidates: [],
      researchFeedback: [],
      remainingLLMCalls: 1,
    });

    expect(completionCreateMock.mock.calls[0][0]).toHaveProperty(
      "reasoning_effort",
      "high"
    );
  });
});
