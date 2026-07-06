import type { Hyperbrowser } from "@hyperbrowser/sdk";
import type {
  CrawledPage,
  CrawlJobResponse,
  CrawlJobStatus,
} from "@hyperbrowser/sdk/types";

import type { MapStreamEvent } from "./types";
import { getPageTitle } from "./map-builder";
import { normalizeUrl } from "./url-utils";

const POLL_INTERVAL_MS = 2000;
const PAGE_REVEAL_DELAY_MS = 120;
const BATCH_SIZE = 100;

type CrawlRunnerParams = {
  client: Hyperbrowser;
  url: string;
  maxPages: number;
  onEvent: (event: MapStreamEvent) => void | Promise<void>;
};

export type CrawlRunResult = {
  jobId: string;
  status: CrawlJobStatus;
  pages: CrawledPage[];
};

export async function runCrawl({
  client,
  url,
  maxPages,
  onEvent,
}: CrawlRunnerParams): Promise<CrawlRunResult> {
  const crawlJob = await client.crawl.start({
    url,
    maxPages,
    followLinks: true,
    ignoreSitemap: false,
    scrapeOptions: {
      formats: ["markdown", "html", "links"],
    },
  });

  await onEvent({
    type: "started",
    jobId: crawlJob.jobId,
    rootUrl: normalizeUrl(url),
    maxPages,
  });

  const seenUrls = new Set<string>();
  let status: CrawlJobStatus = "pending";
  let pages: CrawledPage[] = [];

  while (status !== "completed" && status !== "failed") {
    status = (await client.crawl.getStatus(crawlJob.jobId)).status;
    const snapshot = await getCrawlSnapshot(client, crawlJob.jobId);
    pages = mergePages(pages, snapshot.data ?? []);

    await onEvent({
      type: "progress",
      status,
      totalCrawledPages: snapshot.totalCrawledPages ?? pages.length,
    });

    await emitNewPages(pages, seenUrls, onEvent, 0);

    if (status !== "completed" && status !== "failed") {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  const finalResponse = await getAllCrawledPages(client, crawlJob.jobId);
  pages = mergePages(pages, finalResponse.data ?? []);
  await emitNewPages(pages, seenUrls, onEvent, PAGE_REVEAL_DELAY_MS);

  await onEvent({
    type: "progress",
    status,
    totalCrawledPages: finalResponse.totalCrawledPages ?? pages.length,
  });

  return {
    jobId: crawlJob.jobId,
    status,
    pages,
  };
}

async function emitNewPages(
  pages: CrawledPage[],
  seenUrls: Set<string>,
  onEvent: (event: MapStreamEvent) => void | Promise<void>,
  delayMs: number,
) {
  for (const page of pages) {
    const normalizedUrl = normalizeUrl(page.url);

    if (seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    await onEvent({
      type: "page",
      url: normalizedUrl,
      title: getPageTitle(page),
      status: page.status,
      error: page.error,
      links: page.links ?? [],
      timestamp: new Date().toISOString(),
    });

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }
}

async function getCrawlSnapshot(
  client: Hyperbrowser,
  jobId: string,
): Promise<CrawlJobResponse> {
  try {
    return await client.crawl.get(jobId, { page: 1, batchSize: BATCH_SIZE });
  } catch {
    return {
      jobId,
      status: "pending",
      data: [],
      totalCrawledPages: 0,
      totalPageBatches: 0,
      currentPageBatch: 0,
      batchSize: BATCH_SIZE,
    };
  }
}

async function getAllCrawledPages(
  client: Hyperbrowser,
  jobId: string,
): Promise<CrawlJobResponse> {
  const firstPage = await client.crawl.get(jobId, {
    page: 1,
    batchSize: BATCH_SIZE,
  });
  const pages = [...(firstPage.data ?? [])];
  const totalPageBatches = firstPage.totalPageBatches ?? 1;

  for (let page = 2; page <= totalPageBatches; page += 1) {
    const nextPage = await client.crawl.get(jobId, {
      page,
      batchSize: BATCH_SIZE,
    });
    pages.push(...(nextPage.data ?? []));
  }

  return {
    ...firstPage,
    data: pages,
    currentPageBatch: totalPageBatches,
  };
}

function mergePages(current: CrawledPage[], incoming: CrawledPage[]) {
  const byUrl = new Map(current.map((page) => [normalizeUrl(page.url), page]));

  for (const page of incoming) {
    byUrl.set(normalizeUrl(page.url), page);
  }

  return Array.from(byUrl.values());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
