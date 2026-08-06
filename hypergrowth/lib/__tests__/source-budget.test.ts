import { describe, expect, it } from "vitest";
import { planExecutedSearches } from "../source-budget";
import type { QueryPlan } from "../types";

describe("planExecutedSearches", () => {
  it("plans original plus expanded Hyperbrowser open-web searches", () => {
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
        hyperbrowser: ["browser automation fails forum"],
      },
      rationale: [],
    };

    const searches = planExecutedSearches({
      queryPlan: plan,
      selectedSources: ["hyperbrowser"],
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
        source: "hyperbrowser",
        query: "browser automation fails",
        reason: "original",
      },
      {
        source: "hyperbrowser",
        query: "browser automation fails forum",
        reason: "expanded",
      },
    ]);
  });
});
