import type { CrawlJobStatus, CrawlPageStatus } from "@hyperbrowser/sdk/types";

export type PageSummary = {
  purpose: string;
  keyActions: string[];
  primaryData: string[];
};

export type AgentMapPage = {
  url: string;
  title?: string;
  description?: string;
  status: CrawlPageStatus;
  error?: string | null;
  outboundLinks: string[];
  internalLinks: string[];
  summary?: PageSummary;
};

export type AgentMapEdge = {
  source: string;
  target: string;
};

export type AgentMap = {
  version: "1.0";
  rootUrl: string;
  generatedAt: string;
  crawl: {
    jobId: string;
    status: CrawlJobStatus;
    maxPages: number;
    totalPages: number;
  };
  pages: AgentMapPage[];
  edges: AgentMapEdge[];
};

export type CrawlFeedItem = {
  url: string;
  title?: string;
  status: CrawlPageStatus;
  error?: string | null;
  links: string[];
  timestamp: string;
};

export type MapStreamEvent =
  | {
      type: "started";
      jobId: string;
      rootUrl: string;
      maxPages: number;
    }
  | {
      type: "progress";
      status: CrawlJobStatus;
      totalCrawledPages: number;
    }
  | ({
      type: "page";
    } & CrawlFeedItem)
  | {
      type: "extract";
      url: string;
      summary: PageSummary;
    }
  | {
      type: "artifact";
      artifact: AgentMap;
    }
  | {
      type: "complete";
      artifact: AgentMap;
    }
  | {
      type: "error";
      message: string;
    };
