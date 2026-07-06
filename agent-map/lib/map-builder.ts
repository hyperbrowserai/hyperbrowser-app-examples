import type { CrawledPage, CrawlJobStatus } from "@hyperbrowser/sdk/types";

import type { AgentMap, AgentMapEdge, PageSummary } from "./types";
import { normalizeUrl, resolveUrl } from "./url-utils";

type BuildAgentMapParams = {
  rootUrl: string;
  jobId: string;
  status: CrawlJobStatus;
  maxPages: number;
  pages: CrawledPage[];
  summaries: Map<string, PageSummary>;
};

export function buildAgentMap({
  rootUrl,
  jobId,
  status,
  maxPages,
  pages,
  summaries,
}: BuildAgentMapParams): AgentMap {
  const normalizedRootUrl = normalizeUrl(rootUrl);
  const pageUrls = new Set(pages.map((page) => normalizeUrl(page.url)));
  const edges = buildEdges(pages, pageUrls);

  return {
    version: "1.0",
    rootUrl: normalizedRootUrl,
    generatedAt: new Date().toISOString(),
    crawl: {
      jobId,
      status,
      maxPages,
      totalPages: pages.length,
    },
    pages: pages.map((page) => {
      const normalizedPageUrl = normalizeUrl(page.url);
      const outboundLinks = normalizeLinks(page.links ?? [], page.url);
      const internalLinks = outboundLinks.filter((link) => pageUrls.has(link));

      return {
        url: normalizedPageUrl,
        title: getMetadataString(page.metadata, "title"),
        description: getMetadataString(page.metadata, "description"),
        status: page.status,
        error: page.error,
        outboundLinks,
        internalLinks,
        summary: summaries.get(normalizedPageUrl),
      };
    }),
    edges,
  };
}

export function buildEdges(
  pages: CrawledPage[],
  pageUrls: Set<string>,
): AgentMapEdge[] {
  const seen = new Set<string>();
  const edges: AgentMapEdge[] = [];

  for (const page of pages) {
    const source = normalizeUrl(page.url);
    const links = normalizeLinks(page.links ?? [], page.url);

    for (const target of links) {
      if (!pageUrls.has(target) || target === source) {
        continue;
      }

      const key = `${source}->${target}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      edges.push({ source, target });
    }
  }

  return edges;
}

export function getPageTitle(page: CrawledPage): string {
  return getMetadataString(page.metadata, "title") || page.url;
}

function normalizeLinks(links: string[], baseUrl: string): string[] {
  return Array.from(
    new Set(
      links
        .map((link) => resolveUrl(link, baseUrl))
        .filter((link): link is string => Boolean(link)),
    ),
  );
}

function getMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}
