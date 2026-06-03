import { describe, expect, it } from "vitest";
import { isAllowedHyperbrowserResult } from "../sources";

describe("isAllowedHyperbrowserResult", () => {
  it("accepts Reddit comment permalinks", () => {
    expect(
      isAllowedHyperbrowserResult(
        "https://www.reddit.com/r/webscraping/comments/abc123/playwright_cloudflare/"
      )
    ).toBe(true);
  });

  it("rejects Reddit search and landing pages", () => {
    expect(
      isAllowedHyperbrowserResult("https://www.reddit.com/r/webscraping/search/")
    ).toBe(false);
    expect(isAllowedHyperbrowserResult("https://www.reddit.com/r/webscraping/")).toBe(
      false
    );
  });

  it("keeps non-Reddit URLs", () => {
    expect(isAllowedHyperbrowserResult("https://example.com/post")).toBe(true);
  });
});
