import { describe, expect, it } from "vitest";
import { buildStaticQueryPlan, validateQueryPlan } from "../query-planning";

describe("query planning", () => {
  it("builds source-routed static fallback queries", () => {
    const plan = buildStaticQueryPlan("browser automation fails", [
      "github",
      "hackernews",
      "hyperbrowser",
    ]);

    expect(plan.strategy).toBe("static-source-routed");
    expect(plan.sourceQueries.github).toContain("browser automation fails issue");
    expect(plan.sourceQueries.hackernews).toContain(
      "browser automation fails browser automation"
    );
    expect(plan.sourceQueries.hyperbrowser).toContain(
      "site:reddit.com/r/webscraping browser automation fails"
    );
  });

  it("drops vague or unrelated LLM queries during validation", () => {
    const plan = validateQueryPlan(
      {
        originalQuery: "browser automation fails",
        strategy: "llm-source-routed",
        sourceQueries: {
          github: ["developer pain points", "unrelated accounting reports", "playwright timeout"],
          hackernews: ["market research", "browser automation anti bot"],
          reddit: ["growth ideas", "scraping keeps getting blocked"],
          hyperbrowser: ["browser automation production outage"],
        },
        rationale: ["test"],
      },
      "browser automation fails",
      ["github", "hackernews", "hyperbrowser"]
    );

    expect(plan.sourceQueries.github).toEqual(["playwright timeout"]);
    expect(plan.sourceQueries.hackernews).toEqual(["browser automation anti bot"]);
    expect(plan.sourceQueries.hyperbrowser).toContain(
      "site:reddit.com/r/webscraping browser automation fails"
    );
  });
});
