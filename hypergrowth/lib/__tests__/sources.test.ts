import { afterEach, describe, expect, it, vi } from "vitest";
import { collectSourceCandidates } from "../sources";

describe("collectSourceCandidates", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("uses HN item links for Hacker News comments", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const value = String(url);
      const hits = value.includes("tags=comment")
        ? [
            {
              objectID: "123",
              story_id: 456,
              story_title: "Captcha automation thread",
              story_url: "https://example.com/article",
              comment_text:
                "Playwright captcha automation fails for us in production and the workaround is flaky.",
              author: "dev",
              created_at: "2026-02-02T00:00:00.000Z",
            },
          ]
        : [];

      return Response.json({ hits });
    }) as typeof fetch;

    const candidates = await collectSourceCandidates({
      client: {} as never,
      source: "hackernews",
      query: "playwright captcha",
      maxResults: 2,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.sourceUrl).toBe(
      "https://news.ycombinator.com/item?id=123"
    );
    expect(candidates[0]?.canonicalUrl).toBe(
      "https://news.ycombinator.com/item?id=123"
    );
  });
});
