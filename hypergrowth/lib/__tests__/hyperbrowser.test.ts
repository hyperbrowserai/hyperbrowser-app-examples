import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPageArtifacts } from "../hyperbrowser";

describe("Hyperbrowser fetch artifacts", () => {
  const previousRetryDelays = process.env.HYPERBROWSER_SESSION_RETRY_DELAYS_MS;

  afterEach(() => {
    if (previousRetryDelays === undefined) {
      delete process.env.HYPERBROWSER_SESSION_RETRY_DELAYS_MS;
    } else {
      process.env.HYPERBROWSER_SESSION_RETRY_DELAYS_MS = previousRetryDelays;
    }
  });

  it("requests and parses rich page artifacts", async () => {
    const fetch = vi.fn(async () => ({
      jobId: "job-1",
      status: "completed",
      data: {
        markdown: "Developers cannot get Playwright past captcha.",
        links: ["https://github.com/example/project/issues/1"],
        metadata: {
          title: "Captcha failure thread",
          description: "A developer discussion about captchas.",
          sourceURL: "https://example.com/thread",
        },
        screenshot: "abc123",
        json: {
          pageType: "forum-thread",
          mainTopic: "Playwright captcha failures",
          audience: "developers",
          evidenceValue: "Concrete developer pain about browser automation.",
          painSignals: ["captcha blocks production automation"],
        },
        branding: {
          colors: {
            primary: "#123456",
            accent: "#abcdef",
          },
          personality: {
            tone: "technical",
          },
          confidence: {
            overall: 0.82,
          },
        },
      },
    }));

    const artifacts = await fetchPageArtifacts(
      { web: { fetch } } as never,
      "https://example.com/thread",
      { stealth: "auto" }
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com/thread",
        stealth: "auto",
        outputs: expect.objectContaining({
          formats: expect.arrayContaining([
            "markdown",
            "links",
            "branding",
            expect.objectContaining({ type: "screenshot", format: "webp" }),
            expect.objectContaining({ type: "json" }),
          ]),
        }),
      })
    );
    expect(artifacts).toMatchObject({
      markdown: "Developers cannot get Playwright past captcha.",
      links: ["https://github.com/example/project/issues/1"],
      metadata: {
        title: "Captcha failure thread",
      },
      screenshot: "abc123",
      richFetchStatus: "used",
      outputFormats: [
        "markdown",
        "links",
        "screenshot:webp",
        "json:page-summary",
        "branding",
      ],
      json: {
        pageType: "forum-thread",
        painSignals: ["captcha blocks production automation"],
      },
      branding: {
        primaryColor: "#123456",
        accentColor: "#abcdef",
        tone: "technical",
        confidence: 0.82,
      },
    });
  });

  it("falls back to markdown and links when rich fetch fails", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("json extraction failed"))
      .mockResolvedValueOnce({
        jobId: "job-2",
        status: "completed",
        data: {
          markdown: "Fallback markdown.",
          links: ["https://example.com/next"],
        },
      });

    const artifacts = await fetchPageArtifacts(
      { web: { fetch } } as never,
      "https://example.com/thread"
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[0]).toMatchObject({
      outputs: {
        formats: ["markdown", "links"],
      },
    });
    expect(artifacts).toMatchObject({
      markdown: "Fallback markdown.",
      links: ["https://example.com/next"],
      outputFormats: ["markdown", "links"],
      richFetchStatus: "fallback",
      richFetchError: "json extraction failed",
    });
  });

  it("retries rich fetch when the Hyperbrowser active session cap is still clearing", async () => {
    process.env.HYPERBROWSER_SESSION_RETRY_DELAYS_MS = "0";
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(
        new Error(
          "[Hyperbrowser]: Maximum number of active sessions (1) reached. Please close some sessions before creating new ones."
        )
      )
      .mockResolvedValueOnce({
        jobId: "job-3",
        status: "completed",
        data: {
          markdown: "Retried rich markdown.",
          links: ["https://example.com/retry"],
          screenshot: "abc123",
        },
      });

    const artifacts = await fetchPageArtifacts(
      { web: { fetch } } as never,
      "https://example.com/thread"
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]?.[0]).toMatchObject({
      outputs: {
        formats: expect.arrayContaining([
          expect.objectContaining({ type: "screenshot" }),
          expect.objectContaining({ type: "json" }),
          "branding",
        ]),
      },
    });
    expect(fetch.mock.calls[1]?.[0]).toMatchObject({
      outputs: {
        formats: expect.arrayContaining([
          expect.objectContaining({ type: "screenshot" }),
          expect.objectContaining({ type: "json" }),
          "branding",
        ]),
      },
    });
    expect(artifacts).toMatchObject({
      markdown: "Retried rich markdown.",
      richFetchStatus: "used",
    });
  });
});
