import { describe, expect, it } from "vitest";
import { planExecutedSearches } from "../source-budget";
import type { QueryPlan } from "../types";

describe("planExecutedSearches", () => {
  it("keeps Reddit to one search to avoid single-session churn", () => {
    const plan: QueryPlan = {
      originalQuery: "browser automation fails",
      strategy: "static-source-routed",
      sourceQueries: {
        hackernews: ["browser automation anti bot"],
        github: ["browser automation fails issue"],
        reddit: [
          "browser automation not working",
          "browser automation help",
          "browser automation keeps getting blocked",
        ],
      },
      rationale: [],
    };

    const searches = planExecutedSearches({
      queryPlan: plan,
      selectedSources: ["reddit"],
      policy: {
        maxSourceSearchesPerRun: 4,
        maxQueriesPerSource: 3,
        maxRawSignalsPerSearch: 3,
        maxRawSignalsTotal: 6,
        requestTimeoutMs: 12_000,
      },
    });

    expect(searches).toEqual([
      {
        source: "reddit",
        query: "browser automation fails",
        reason: "original",
      },
    ]);
  });
});
