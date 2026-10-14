import { Hyperbrowser } from "@hyperbrowser/sdk";
import type { WebMCPTool } from "@hyperbrowser/sdk/types";
import { chromium, type Browser } from "playwright-core";
import type { CensusRun, SiteResult, ToolRecord } from "./types";

export type ScanOptions = {
  /** Hard budget for one site, including session creation and teardown wait. */
  timeoutMs: number;
  /** Upper bound on how long to wait for late tool registration after load. */
  settleMs: number;
};

export type CensusOptions = ScanOptions & {
  concurrency: number;
  mode?: CensusRun["mode"];
  scanner?: (url: string, opts: ScanOptions) => Promise<SiteResult>;
  onResult?: (result: SiteResult, done: number, total: number) => void;
};

export const DEFAULTS = {
  concurrency: 3,
  timeoutMs: 45_000,
  settleMs: 6_000,
} as const;

const POLL_INTERVAL_MS = 1_500;

class DeadlineError extends Error {}

function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (ms <= 0) return Promise.reject(new DeadlineError(`${label}: out of time`));
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineError(`${label}: timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Page-controlled strings: drop control characters so they can't mess with
// terminals or CSV consumers. Content is otherwise kept verbatim.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export function cleanText(value: string | undefined): string {
  return (value ?? "").replace(CONTROL_CHARS, "");
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  return url.toString();
}

export function toToolRecord(tool: WebMCPTool): ToolRecord {
  return {
    name: cleanText(tool.name),
    title: tool.title ? cleanText(tool.title) : undefined,
    description: cleanText(tool.description),
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    annotations: { ...tool.annotations },
    declarative: tool.declarative,
    provider: tool.source.provider,
    pageUrl: cleanText(tool.source.pageUrl),
    pageTitle: cleanText(tool.source.pageTitle),
    tabId: tool.source.tabId,
    frameUrl: cleanText(tool.source.frame.url),
    isMainFrame: tool.source.frame.isMainFrame,
  };
}

let cachedClient: Hyperbrowser | null = null;
export function getHyperbrowser(): Hyperbrowser {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) throw new Error("HYPERBROWSER_API_KEY is not set");
  cachedClient = new Hyperbrowser({ apiKey });
  return cachedClient;
}

/**
 * Opens one site in its own WebMCP-enabled Hyperbrowser session and lists the
 * tools it declares. Discovery only: this never invokes a tool.
 */
export async function scanSite(rawUrl: string, opts: ScanOptions): Promise<SiteResult> {
  const startedAt = Date.now();
  const remaining = () => opts.timeoutMs - (Date.now() - startedAt);
  const checkedAt = new Date().toISOString();

  let url: string;
  try {
    url = normalizeUrl(rawUrl);
  } catch (err) {
    return {
      url: rawUrl,
      host: rawUrl,
      status: "error",
      error: err instanceof Error ? err.message : "Invalid URL",
      durationMs: 0,
      checkedAt,
      tools: [],
    };
  }

  const result: SiteResult = {
    url,
    host: new URL(url).hostname.replace(/^www\./, ""),
    status: "ok",
    durationMs: 0,
    checkedAt,
    tools: [],
  };

  const client = getHyperbrowser();
  const sessionTimeoutMinutes = Math.max(2, Math.ceil(opts.timeoutMs / 60_000) + 1);
  const creating = client.sessions.create({
    enableWebMcp: true,
    timeoutMinutes: sessionTimeoutMinutes,
  });

  let sessionId: string | undefined;
  let browser: Browser | undefined;
  try {
    const session = await withDeadline(creating, remaining(), "create session");
    sessionId = session.id;

    browser = await withDeadline(
      chromium.connectOverCDP(session.wsEndpoint),
      remaining(),
      "connect"
    );
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());

    try {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: Math.max(1_000, remaining() - opts.settleMs - 3_000),
      });
      result.httpStatus = response?.status();
      await page
        .waitForLoadState("load", { timeout: Math.min(5_000, Math.max(0, remaining() - 3_000)) })
        .catch(() => undefined);
    } catch (err) {
      // A slow or half-loaded page can still have registered tools, so keep
      // going and let discovery decide; the note is kept for the report.
      result.error = `navigation: ${err instanceof Error ? err.message.split("\n")[0] : "failed"}`;
    }

    // Sites can register tools after load (SPAs, origin-trial checks). Poll
    // discovery until the count is stable for two reads or settleMs runs out.
    const settleStart = Date.now();
    let previous = -1;
    for (;;) {
      const discovery = await withDeadline(
        client.sessions.webmcp.listTools(session.id),
        remaining(),
        "list tools"
      );
      result.tools = discovery.tools.map(toToolRecord);
      result.nativeSupported = discovery.nativeSupported;
      result.truncated = discovery.truncated;

      const stable = discovery.tools.length === previous;
      previous = discovery.tools.length;
      const settled = Date.now() - settleStart >= opts.settleMs;
      if ((stable && Date.now() - settleStart >= POLL_INTERVAL_MS * 2) || settled) break;
      if (remaining() < POLL_INTERVAL_MS + 2_000) break;
      await sleep(POLL_INTERVAL_MS);
    }

    result.finalUrl = page.url();
    result.pageTitle = cleanText(await page.title().catch(() => ""));
    if (result.error && result.tools.length === 0) result.status = "error";
  } catch (err) {
    result.status = err instanceof DeadlineError ? "timeout" : "error";
    result.error = err instanceof Error ? err.message.split("\n")[0] : String(err);
  } finally {
    await browser?.close().catch(() => undefined);
    if (sessionId) {
      await client.sessions.stop(sessionId).catch(() => undefined);
    } else {
      // Creation outlived the deadline; stop the session whenever it arrives.
      creating.then((s) => client.sessions.stop(s.id)).catch(() => undefined);
    }
    result.durationMs = Date.now() - startedAt;
  }

  return result;
}

export async function runCensus(urls: string[], opts: CensusOptions): Promise<CensusRun> {
  const scanner = opts.scanner ?? scanSite;
  const results: SiteResult[] = new Array(urls.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < urls.length) {
      const index = next++;
      const result = await scanner(urls[index], opts);
      results[index] = result;
      done++;
      opts.onResult?.(result, done, urls.length);
    }
  }

  const workers = Math.max(1, Math.min(opts.concurrency, urls.length));
  await Promise.all(Array.from({ length: workers }, worker));

  return {
    generatedAt: new Date().toISOString(),
    mode: opts.mode ?? "live",
    settings: {
      concurrency: opts.concurrency,
      timeoutMs: opts.timeoutMs,
      settleMs: opts.settleMs,
    },
    sites: results,
  };
}
