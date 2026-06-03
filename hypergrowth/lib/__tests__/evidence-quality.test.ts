import { describe, expect, it } from "vitest";
import { applyEvidenceQualityGate } from "../evidence-quality";
import type { EvidenceCandidate } from "../types";

describe("applyEvidenceQualityGate", () => {
  it("rejects login and navigation chrome before scoring", () => {
    const candidate = candidateWith({
      title: "[Skip to content](https://github.com)",
      snippet: "[Sign in](https://github.com/login?return_to=/search)",
    });

    const result = applyEvidenceQualityGate(
      [candidate],
      "playwright cloudflare blocked"
    );

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.qualityFlags).toContain("login_required");
  });

  it("keeps concrete developer pain evidence", () => {
    const candidate = candidateWith({
      title: "Playwright fails behind Cloudflare in production",
      snippet:
        "Our Playwright browser automation works locally but gets blocked by Cloudflare captcha checks in production.",
    });

    const result = applyEvidenceQualityGate(
      [candidate],
      "playwright cloudflare blocked"
    );

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });
});

function candidateWith(
  overrides: Pick<EvidenceCandidate, "title" | "snippet">
): EvidenceCandidate {
  return {
    id: "candidate-1",
    source: "github",
    discoveryMethod: "api",
    sourceUrl: "https://api.github.com/search/issues",
    canonicalUrl: "https://github.com/example/repo/issues/1",
    body: "",
    author: "dev",
    evidenceKind: "issue",
    qualityFlags: [],
    ...overrides,
  };
}
