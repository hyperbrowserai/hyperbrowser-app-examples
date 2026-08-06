import { describe, expect, it } from "vitest";
import { mineRequestSchema } from "../schema";

describe("mineRequestSchema", () => {
  it("defaults omitted analysis mode to full", () => {
    const parsed = mineRequestSchema.parse({
      query: "Playwright captcha failures",
      sources: ["github"],
      maxResults: 6,
    });

    expect(parsed.analysisMode).toBe("full");
  });

  it("accepts only deterministic and full analysis modes", () => {
    expect(
      mineRequestSchema.parse({
        query: "Playwright captcha failures",
        sources: ["github"],
        maxResults: 6,
        analysisMode: "deterministic",
      }).analysisMode
    ).toBe("deterministic");

    expect(
      mineRequestSchema.safeParse({
        query: "Playwright captcha failures",
        sources: ["github"],
        maxResults: 6,
        analysisMode: "lean",
      }).success
    ).toBe(false);

    expect(
      mineRequestSchema.safeParse({
        query: "Playwright captcha failures",
        sources: ["github"],
        maxResults: 6,
        analysisMode: "balanced",
      }).success
    ).toBe(false);
  });
});
