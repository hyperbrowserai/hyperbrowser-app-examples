import { describe, expect, it } from "vitest";
import { runAutonomousResearch } from "../research/controller";
import {
  buildStaticResearchPlan,
  parseResearchPlanContent,
} from "../research/planner";
import {
  isPromotionalEvidence,
  parseEvidenceJudgmentContent,
} from "../research/evidence-judge";
import type { EvidenceCandidate, OpenWebTargets, SignalSource } from "../types";

const openWebTargets: OpenWebTargets = {
  includeBroadWeb: true,
  redditSubreddits: ["webscraping", "playwright"],
};

describe("autonomous research", () => {
  it("plans terse Hacker News keyword queries for long problem statements", () => {
    const plan = buildStaticResearchPlan(
      "running into captcha errors while using automated browser automation",
      ["hackernews"],
      openWebTargets
    );

    expect(plan.waves[0].searches[0]).toMatchObject({
      source: "hackernews",
      query: "browser automation captcha",
    });
    expect(plan.waves[0].searches[0].query.split(/\s+/).length).toBeLessThanOrEqual(5);
  });

  it("does not let generic words like cause dominate Hacker News queries", () => {
    const plan = buildStaticResearchPlan(
      "what can cause captcha errors in browser automation",
      ["hackernews"],
      openWebTargets
    );

    expect(plan.waves[0].searches.map((search) => search.query)).toEqual([
      "browser automation captcha",
      "scraping captcha",
    ]);
  });

  it("accepts common LLM JSON variants for planner and rejected judgments", () => {
    const plan = parseResearchPlanContent(
      JSON.stringify({
        rationale: "HN needs terse keyword queries.",
        searches: [
          {
            source: "hackernews",
            query: "playwright captcha",
            rationale: "Concrete HN query.",
          },
        ],
      })
    );
    const judgment = parseEvidenceJudgmentContent(
      JSON.stringify({
        judgments: [
          {
            candidateId: "one",
            accepted: false,
            quote: null,
            title: null,
            rationale: "Not relevant.",
          },
        ],
      })
    );

    expect(plan.rationale).toEqual(["HN needs terse keyword queries."]);
    expect(judgment.judgments[0]).toMatchObject({
      candidateId: "one",
      accepted: false,
      quote: null,
    });
  });

  it("rejects fetched Reddit block walls instead of turning them into evidence", async () => {
    const run = await runAutonomousResearch({
      client: {} as never,
      query: "playwright captcha",
      sources: ["hyperbrowser"],
      openWebTargets,
      maxResults: 3,
      allowLLM: false,
      searchAdapter: async ({ source, query }) => [
        candidate({
          id: `${source}-${query}`,
          source,
          title: "Reddit discussion about Playwright captcha",
          snippet: "Developers discuss captcha failures in browser automation.",
          canonicalUrl:
            "https://www.reddit.com/r/playwright/comments/abc/playwright_captcha/",
        }),
      ],
      fetchAdapter: async (candidate) => ({
        candidateId: candidate.id,
        url: candidate.canonicalUrl ?? candidate.sourceUrl,
        markdown:
          "To continue, log in to your Reddit account or use your developer token. If you think you've been blocked by mistake, file a ticket below and we'll look into it.",
        status: "success",
      }),
      budget: { maxFetchesPerRun: 1, maxQueriesPerWave: 1 },
    });

    expect(run.rawSignals).toEqual([]);
    expect(run.qualityRejected.length).toBeGreaterThan(0);
  });

  it("keeps concrete GitHub issue evidence when Hyperbrowser fetches are noisy", async () => {
    const run = await runAutonomousResearch({
      client: {} as never,
      query: "playwright captcha",
      sources: ["github", "hyperbrowser"],
      openWebTargets,
      maxResults: 3,
      allowLLM: false,
      searchAdapter: async ({ source, query }) => {
        if (source === "github") {
          return [
            candidate({
              id: `github-${query}`,
              source,
              title: "Playwright captcha fails in production behind Cloudflare",
              snippet:
                "We cannot get Playwright past captcha in production and the workaround is flaky.",
              body:
                "We cannot get Playwright past captcha in production and the workaround is flaky. It fails behind Cloudflare even though local browser automation works.",
              canonicalUrl: "https://github.com/example/project/issues/1",
              evidenceKind: "issue",
            }),
          ];
        }

        return [
          candidate({
            id: `hyperbrowser-${query}`,
            source,
            title: "Reddit discussion about Playwright captcha",
            snippet: "Developers discuss captcha failures in browser automation.",
            canonicalUrl:
              "https://www.reddit.com/r/playwright/comments/abc/playwright_captcha/",
          }),
        ];
      },
      fetchAdapter: async (candidate) => ({
        candidateId: candidate.id,
        url: candidate.canonicalUrl ?? candidate.sourceUrl,
        markdown:
          "To continue, log in to your Reddit account or use your developer token.",
        status: "success",
      }),
      budget: { maxFetchesPerRun: 1, maxQueriesPerWave: 3 },
    });

    expect(run.rawSignals.some((signal) => signal.source === "github")).toBe(true);
    expect(
      run.rawSignals.every((signal) => !signal.quote.includes("use your developer token"))
    ).toBe(true);
  });

  it("rejects ads, hiring copy, and vendor self-promotion as evidence", async () => {
    const run = await runAutonomousResearch({
      client: {} as never,
      query: "captcha browser automation",
      sources: ["hackernews"],
      openWebTargets,
      maxResults: 3,
      allowLLM: false,
      searchAdapter: async ({ source }) => [
        candidate({
          id: "hn-ad",
          source,
          title: "Developer advocate for anti-bot browser automation",
          snippet:
            "We focus on hard technical problems (anti-bot, browser automation, fingerprinting, captcha solving).",
          body:
            "We focus on hard technical problems (anti-bot, browser automation, fingerprinting, captcha solving).",
          canonicalUrl: "https://news.ycombinator.com/item?id=1",
          evidenceKind: "comment",
        }),
        candidate({
          id: "hn-pain",
          source,
          title: "Debugging captcha automation is painful",
          snippet:
            "When debugging image selection captchas, logs do not tell you why the agent clicked the wrong tiles.",
          body:
            "When debugging image selection captchas, logs do not tell you why the agent clicked the wrong tiles. I found myself staring at execution logs and just wanted to watch it work.",
          canonicalUrl: "https://news.ycombinator.com/item?id=2",
          evidenceKind: "comment",
        }),
      ],
      budget: { maxFetchesPerRun: 0, maxQueriesPerWave: 1 },
    });

    expect(isPromotionalEvidence("We focus on hard technical problems captcha solving.")).toBe(
      true
    );
    expect(run.rawSignals).toHaveLength(1);
    expect(run.rawSignals[0]?.canonicalUrl).toBe(
      "https://news.ycombinator.com/item?id=2"
    );
    expect(run.qualityRejected[0]?.qualityFlags).toContain("promotional");
  });
});

function candidate({
  id,
  source,
  title,
  snippet,
  body,
  canonicalUrl,
  evidenceKind = "post",
}: {
  id: string;
  source: SignalSource;
  title: string;
  snippet: string;
  body?: string;
  canonicalUrl: string;
  evidenceKind?: EvidenceCandidate["evidenceKind"];
}): EvidenceCandidate {
  return {
    id,
    source,
    discoveryMethod: source === "hyperbrowser" ? "hyperbrowser-search" : "api",
    sourceUrl: `${source}:search`,
    canonicalUrl,
    title,
    snippet,
    body,
    evidenceKind,
    qualityFlags: [],
  };
}
