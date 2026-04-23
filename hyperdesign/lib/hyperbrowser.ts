import { Hyperbrowser } from "@hyperbrowser/sdk";
import { chromium } from "playwright";

function getClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not configured");
  }
  return new Hyperbrowser({ apiKey });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface Screenshots {
  /** Viewport-only — sent to the AI for analysis (better token efficiency). */
  viewport: string;
  /** Full scrollable page — shown in the lightbox. */
  fullPage: string;
}

/**
 * Capture both a viewport and full-page screenshot in one Playwright session.
 */
export async function captureScreenshots(
  url: string,
  options: { timeoutMs?: number; retries?: number } = {}
): Promise<Screenshots> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const retries = options.retries ?? 2;
  const client = getClient();

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    let sessionId: string | undefined;
    let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | undefined;

    try {
      const session = await client.sessions.create({
        useStealth: true,
        useProxy: true,
        solveCaptchas: true,
        acceptCookies: true,
        screen: { width: 1920, height: 1080 },
      });

      sessionId = session.id;
      browser = await chromium.connectOverCDP(session.wsEndpoint);
      const context = browser.contexts()[0] || (await browser.newContext());
      const page = await context.newPage();

      await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });

      const [viewportBuf, fullPageBuf] = await Promise.all([
        page.screenshot({ type: "png" }),
        page.screenshot({ type: "png", fullPage: true }),
      ]);

      return {
        viewport: viewportBuf.toString("base64"),
        fullPage: fullPageBuf.toString("base64"),
      };
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(500 * 2 ** attempt);
      attempt += 1;
    } finally {
      if (browser) await browser.close().catch(() => undefined);
      if (sessionId) await client.sessions.stop(sessionId).catch(() => undefined);
    }
  }

  throw new Error(
    `Failed to capture screenshots: ${
      lastError instanceof Error ? lastError.message : "Unknown error"
    }`
  );
}

/**
 * Scrape page content (markdown) including full page context for CSS-derived tokens.
 */
export async function scrapePageForDesign(url: string): Promise<string> {
  const client = getClient();

  const result = await client.scrape.startAndWait({
    url,
    scrapeOptions: {
      formats: ["markdown"],
      onlyMainContent: false,
    },
  });

  const markdown = result.data?.markdown ?? "";
  if (!markdown.trim()) {
    throw new Error("Scrape returned no markdown content");
  }
  return markdown;
}
