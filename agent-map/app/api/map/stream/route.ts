import type { CrawledPage } from "@hyperbrowser/sdk/types";

import { runCrawl } from "@/lib/crawl-runner";
import { extractPageSummary } from "@/lib/extract-page";
import { getHyperbrowserClient } from "@/lib/hyperbrowser";
import { buildAgentMap } from "@/lib/map-builder";
import type { MapStreamEvent, PageSummary } from "@/lib/types";
import { normalizeUrl } from "@/lib/url-utils";

export const runtime = "nodejs";

const DEFAULT_MAX_PAGES = 15;
const MAX_PAGES_LIMIT = 100;
const EXTRACT_CONCURRENCY = 2;

type RequestBody = {
  url?: unknown;
  maxPages?: unknown;
};

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const body = await readRequestBody(request);

  if (!process.env.HYPERBROWSER_API_KEY) {
    return Response.json(
      { message: "Missing HYPERBROWSER_API_KEY in .env.local" },
      { status: 500 },
    );
  }

  const parsedUrl = parseHttpUrl(body.url);

  if (!parsedUrl) {
    return Response.json(
      { message: "Enter a valid http or https URL." },
      { status: 400 },
    );
  }

  const maxPages = clampMaxPages(body.maxPages);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: MapStreamEvent) => {
        controller.enqueue(
          encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        const client = getHyperbrowserClient();
        const summaries = new Map<string, PageSummary>();
        const crawlResult = await runCrawl({
          client,
          url: parsedUrl,
          maxPages,
          onEvent: send,
        });
        const sendArtifact = () => {
          send({
            type: "artifact",
            artifact: buildAgentMap({
              rootUrl: parsedUrl,
              jobId: crawlResult.jobId,
              status: crawlResult.status,
              maxPages,
              pages: crawlResult.pages,
              summaries,
            }),
          });
        };

        sendArtifact();

        await extractCompletedPages({
          pages: crawlResult.pages,
          summaries,
          extract: async (page) => {
            const summary = await extractPageSummary(client, page.url);
            const normalizedUrl = normalizeUrl(page.url);
            summaries.set(normalizedUrl, summary);
            send({
              type: "extract",
              url: normalizedUrl,
              summary,
            });
            sendArtifact();
          },
          onError: (page, error) => {
            send({
              type: "error",
              message: `Extract failed for ${page.url}: ${getErrorMessage(error)}`,
            });
          },
        });

        send({
          type: "complete",
          artifact: buildAgentMap({
            rootUrl: parsedUrl,
            jobId: crawlResult.jobId,
            status: crawlResult.status,
            maxPages,
            pages: crawlResult.pages,
            summaries,
          }),
        });
      } catch (error) {
        send({
          type: "error",
          message: getErrorMessage(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function extractCompletedPages({
  pages,
  summaries,
  extract,
  onError,
}: {
  pages: CrawledPage[];
  summaries: Map<string, PageSummary>;
  extract: (page: CrawledPage) => Promise<void>;
  onError: (page: CrawledPage, error: unknown) => void;
}) {
  const completedPages = pages.filter((page) => page.status === "completed");
  let index = 0;

  async function worker() {
    while (index < completedPages.length) {
      const page = completedPages[index];
      index += 1;

      if (summaries.has(normalizeUrl(page.url))) {
        continue;
      }

      try {
        await extract(page);
      } catch (error) {
        onError(page, error);
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(EXTRACT_CONCURRENCY, completedPages.length) },
      () => worker(),
    ),
  );
}

async function readRequestBody(request: Request): Promise<RequestBody> {
  try {
    return (await request.json()) as RequestBody;
  } catch {
    return {};
  }
}

function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? normalizeUrl(url.toString())
      : null;
  } catch {
    return null;
  }
}

function clampMaxPages(value: unknown) {
  const numberValue =
    typeof value === "number" && Number.isFinite(value)
      ? Math.trunc(value)
      : DEFAULT_MAX_PAGES;

  return Math.min(Math.max(numberValue, 1), MAX_PAGES_LIMIT);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
