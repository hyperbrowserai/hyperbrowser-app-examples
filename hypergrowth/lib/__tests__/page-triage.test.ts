import { describe, expect, it } from "vitest";
import {
  parsePageTriageContent,
  sanitizePageTriageDecisions,
} from "../research/page-triage";
import type { EvidenceCandidate } from "../types";

describe("page triage", () => {
  it("parses common LLM JSON and preserves artifact signals", () => {
    const parsed = parsePageTriageContent(
      JSON.stringify({
        decisions: [
          {
            candidateId: "web-1",
            decision: "accept",
            evidenceQuote:
              "Playwright captcha automation fails for us in production.",
            evidenceTitle: "Captcha automation failure",
            pageType: "forum-thread",
            painCategory: "anti_bot_reliability",
            hyperbrowserFit: 0.91,
            confidence: 0.82,
            reasoning: ["Grounded developer complaint."],
            artifactSignals: ["markdown", "json", "screenshot"],
          },
        ],
      })
    );

    expect(parsed.decisions[0]).toMatchObject({
      candidateId: "web-1",
      decision: "accept",
      artifactSignals: ["markdown", "json", "screenshot"],
    });
  });

  it("downgrades accepted decisions when the quote is not grounded", () => {
    const decisions = sanitizePageTriageDecisions({
      candidates: [
        candidate({
          id: "web-1",
          title: "Playwright captcha thread",
          snippet:
            "Developers discuss captcha failures in browser automation.",
        }),
      ],
      fetchedDocuments: [
        {
          candidateId: "web-1",
          url: "https://example.com/thread",
          markdown:
            "Developers say Playwright captcha automation fails for us in production and the workaround is flaky.",
          links: ["https://github.com/example/project/issues/1"],
          pageSummary: {
            pageType: "forum-thread",
            evidenceValue: "Developer pain about captchas.",
          },
          screenshot: {
            src: "abc123",
            byteLength: 120,
          },
          status: "success",
        },
      ],
      decisions: [
        {
          candidateId: "web-1",
          decision: "accept",
          evidenceQuote: "This quote was invented by the model.",
          evidenceTitle: "Invented title",
          pageType: "forum-thread",
          painCategory: "anti_bot_reliability",
          hyperbrowserFit: 2,
          confidence: -1,
          reasoning: ["Looks useful."],
          rejectionReason: undefined,
          followUpSearches: [],
          artifactSignals: [],
        },
      ],
    });

    expect(decisions[0]).toMatchObject({
      candidateId: "web-1",
      decision: "reject",
      evidenceQuote: undefined,
      hyperbrowserFit: 1,
      confidence: 0,
      rejectionReason: "Accepted quote was not grounded in fetched page text.",
    });
    expect(decisions[0]?.artifactSignals).toEqual([
      "markdown",
      "links",
      "json",
      "screenshot",
    ]);
  });
});

function candidate({
  id,
  title,
  snippet,
}: {
  id: string;
  title: string;
  snippet: string;
}): EvidenceCandidate {
  return {
    id,
    source: "hyperbrowser",
    discoveryMethod: "hyperbrowser-search",
    sourceUrl: "hyperbrowser:search",
    canonicalUrl: "https://example.com/thread",
    title,
    snippet,
    qualityFlags: [],
  };
}
