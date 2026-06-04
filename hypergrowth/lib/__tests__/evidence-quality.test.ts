import { describe, expect, it } from "vitest";
import { applyEvidenceQualityGate } from "../evidence-quality";
import type { EvidenceCandidate } from "../types";

describe("applyEvidenceQualityGate", () => {
  it("does not hard-reject sign-in affordances before LLM triage", () => {
    const candidate = candidateWith({
      title: "Playwright session fails after login",
      snippet:
        "Developers say the browser automation works until the app asks users to sign in again.",
    });

    const result = applyEvidenceQualityGate(
      [candidate],
      "playwright login session"
    );

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.accepted[0]?.qualityFlags).not.toContain("login_required");
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
