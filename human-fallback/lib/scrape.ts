import { Hyperbrowser } from '@hyperbrowser/sdk';

export interface ScrapeOptions {
  url: string;
  apiKey: string;
  onProgress?: (message: string) => void;
}

export interface ScrapeResult {
  success: boolean;
  content: string;
  title: string;
  url: string;
  failureReason?: string;
}

/**
 * Indicators that a page is blocked by a CAPTCHA, login wall,
 * or other anti-bot measure.
 */
const BLOCK_INDICATORS = [
  'captcha',
  'cf-challenge',
  'challenge-running',
  'please verify you are a human',
  'access denied',
  'please complete the security check',
  'just a moment',
  'checking your browser',
  'sign in to continue',
  'log in to continue',
  'please log in',
  'login required',
  'enable javascript and cookies',
];

function detectBlock(html: string, title: string): string | null {
  const combined = (html + ' ' + title).toLowerCase();
  for (const indicator of BLOCK_INDICATORS) {
    if (combined.includes(indicator)) {
      return indicator;
    }
  }
  // Very short page content is often a block page
  const textContent = html.replace(/<[^>]*>/g, '').trim();
  if (textContent.length < 100) {
    return 'page returned minimal content (likely blocked)';
  }
  return null;
}

export async function scrapePage(options: ScrapeOptions): Promise<ScrapeResult> {
  const { url, apiKey, onProgress } = options;
  let session: any = null;
  let browser: any = null;

  try {
    onProgress?.('Launching Hyperbrowser session...');

    const hb = new Hyperbrowser({ apiKey });

    session = await hb.sessions.create({
      useStealth: true,
      useProxy: false,
    });

    onProgress?.('Connecting to browser...');

    const { connect } = await import('puppeteer-core');
    browser = await connect({
      browserWSEndpoint: session.wsEndpoint,
      defaultViewport: null,
    });

    const [page] = await browser.pages();

    onProgress?.('Navigating to target URL...');

    let retries = 2;
    while (retries > 0) {
      try {
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 15000,
        });
        break;
      } catch (navError) {
        retries--;
        if (retries === 0) throw navError;
        onProgress?.(`Navigation failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    onProgress?.('Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const title = await page.title();
    const html = await page.content();

    // Check for anti-bot blocks
    const blockReason = detectBlock(html, title);
    if (blockReason) {
      onProgress?.(`Block detected: ${blockReason}`);
      return {
        success: false,
        content: html,
        title,
        url,
        failureReason: blockReason,
      };
    }

    // Extract readable text content
    const textContent = await page.evaluate(() => {
      const body = document.body;
      if (!body) return '';
      // Remove scripts and styles
      const clone = body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      return clone.innerText || clone.textContent || '';
    });

    onProgress?.('Page scraped successfully!');

    return {
      success: true,
      content: textContent.trim(),
      title,
      url,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    onProgress?.(`Scrape failed: ${message}`);
    return {
      success: false,
      content: '',
      title: '',
      url,
      failureReason: message,
    };
  } finally {
    try {
      if (browser) await browser.close();
      if (session?.destroy) await session.destroy();
    } catch {
      // Cleanup errors are non-fatal
    }
  }
}
