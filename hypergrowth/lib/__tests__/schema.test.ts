import { describe, expect, it } from "vitest";
import { mineRequestSchema } from "../schema";

describe("mineRequestSchema", () => {
  it("defaults to GitHub, Hacker News, and Hyperbrowser", () => {
    const parsed = mineRequestSchema.parse({
      query: "playwright cloudflare",
      maxResults: 6,
    });

    expect(parsed.sources).toEqual(["hackernews", "github", "hyperbrowser"]);
  });

  it("rejects direct Reddit as a source", () => {
    const parsed = mineRequestSchema.safeParse({
      query: "playwright cloudflare",
      sources: ["reddit"],
      maxResults: 6,
    });

    expect(parsed.success).toBe(false);
  });

  it("sanitizes subreddit targets", () => {
    const parsed = mineRequestSchema.parse({
      query: "playwright cloudflare",
      sources: ["hyperbrowser"],
      maxResults: 6,
      openWebTargets: {
        includeBroadWeb: true,
        redditSubreddits: ["r/webscraping", "playwright", "webscraping"],
      },
    });

    expect(parsed.openWebTargets.redditSubreddits).toEqual([
      "webscraping",
      "playwright",
    ]);
  });
});
