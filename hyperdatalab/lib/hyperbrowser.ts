import { Hyperbrowser } from '@hyperbrowser/sdk';
import { getEnv, HYPERBROWSER_DEFAULT_BASE_URL } from './config';
import { ensureDir, resolveRunPath, writeFileSafe } from './fs';

export type Evidence = {
  htmlPath: string;
  screenshotPath: string;
};

export type FetchResult = {
  html: string;
  text: string;
  screenshotFile: string; 
  textPath: string; 
  evidence: Evidence;
};

export async function createHBClient(overrideApiKey?: string): Promise<Hyperbrowser> {
  // If we have an override API key, use it directly without checking environment variables
  if (overrideApiKey) {
    console.log('[HB] Using provided API key');
    const client = new Hyperbrowser({
      apiKey: overrideApiKey,
      baseUrl: process.env.HB_BASE_URL || HYPERBROWSER_DEFAULT_BASE_URL,
      timeout: 60000,
    });
    return client;
  }
  
  // Otherwise, fall back to environment variables
  const { HYPERBROWSER_API_KEY, HB_BASE_URL } = getEnv();
  const client = new Hyperbrowser({
    apiKey: HYPERBROWSER_API_KEY,
    baseUrl: HB_BASE_URL || HYPERBROWSER_DEFAULT_BASE_URL,
    timeout: 60000,
  });
  return client;
}

export async function fetchWithEvidence(params: {
  url: string;
  runId: string;
  apiKey?: string;
}): Promise<FetchResult> {
  const client = await createHBClient(params.apiKey);

  try {
    console.log(`[HB] Starting scrape for ${params.url}`);
    const result = await client.scrape.startAndWait({
      url: params.url,
      scrapeOptions: {
        formats: ["html", "markdown"],
      },
    });
    console.log(`[HB] Raw result:`, JSON.stringify(result, null, 2).slice(0, 500));

    type ScrapeData = { html?: string; markdown?: string; screenshot?: string };
    const html: string = (result.data as ScrapeData)?.html || '';
    const text: string = (result.data as ScrapeData)?.markdown || '';
    const screenshotBase64: string | undefined = (result.data as ScrapeData)?.screenshot;

    const runDir = resolveRunPath(params.runId);
    ensureDir(runDir);
    const evidenceDir = resolveRunPath(params.runId, 'evidence');
    ensureDir(evidenceDir);

    const htmlPath = resolveRunPath(params.runId, 'evidence', 'page.html');
    const screenshotPath = resolveRunPath(params.runId, 'evidence', 'screenshot.png');
    const textPath = resolveRunPath(params.runId, 'evidence', 'page.txt');

    writeFileSafe(htmlPath, html);
    console.log(`[HB] Scrape ok run=${params.runId} htmlLen=${html.length} textLen=${text.length}`);
    writeFileSafe(textPath, text && text.length > 0 ? text : html);
    if (screenshotBase64) {
      writeFileSafe(screenshotPath, Buffer.from(screenshotBase64, 'base64'));
    }

    const out = {
      html,
      text,
      screenshotFile: screenshotPath,
      textPath,
      evidence: { htmlPath, screenshotPath },
    };
    console.log(`[HB] Saved evidence run=${params.runId} html=${out.evidence.htmlPath} txt=${textPath}`);
    return out;
  } finally {
  }
}


