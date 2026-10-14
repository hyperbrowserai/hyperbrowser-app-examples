// Everything under `tools` is page-controlled text copied verbatim from the
// Hyperbrowser WebMCP discovery response. Render it as plain text and never
// treat annotations as permissions.

export type ToolAnnotations = {
  readOnly: boolean;
  untrustedContent: boolean;
  consequential: boolean;
  autosubmit: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  openWorld?: boolean;
};

export type ToolRecord = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations: ToolAnnotations;
  declarative: boolean;
  provider: "native" | "polyfill";
  pageUrl: string;
  pageTitle: string;
  tabId: string;
  frameUrl: string;
  isMainFrame: boolean;
};

export type SiteStatus = "ok" | "timeout" | "error";

export type SiteResult = {
  url: string;
  host: string;
  status: SiteStatus;
  error?: string;
  finalUrl?: string;
  pageTitle?: string;
  httpStatus?: number;
  nativeSupported?: boolean;
  truncated?: boolean;
  durationMs: number;
  checkedAt: string;
  tools: ToolRecord[];
};

export type CensusRun = {
  generatedAt: string;
  mode: "live" | "mock";
  settings: {
    concurrency: number;
    timeoutMs: number;
    settleMs: number;
  };
  sites: SiteResult[];
};

export type SiteSummary = {
  url: string;
  host: string;
  status: SiteStatus;
  error?: string;
  httpStatus?: number;
  toolCount: number;
  readOnlyHints: number;
  consequentialHints: number;
  destructiveHints: number;
  declarative: number;
  imperative: number;
  frames: number;
  tabs: number;
  providers: string[];
  durationMs: number;
};
