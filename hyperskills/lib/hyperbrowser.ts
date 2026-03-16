import { Hyperbrowser } from "@hyperbrowser/sdk";
import { ScrapedContent } from "@/types";

function getClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not configured");
  }
  return new Hyperbrowser({ apiKey });
}

export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    const client = getClient();

    const result = await client.scrape.startAndWait({
      url,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    });

    const markdown = result.data?.markdown || "";

    return {
      url,
      markdown,
      success: markdown.length > 0,
      error: markdown.length > 0 ? undefined : "No content extracted",
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    return {
      url,
      markdown: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function scrapeUrls(urls: string[]): Promise<ScrapedContent[]> {
  if (urls.length === 0) {
    throw new Error("No URLs provided to scrape");
  }

  if (urls.length === 1) {
    const result = await scrapeUrl(urls[0]);
    if (!result.success || result.markdown.length === 0) {
      throw new Error("Failed to scrape any URLs successfully");
    }
    return [result];
  }

  return scrapeBatch(urls);
}

/**
 * Scrape multiple URLs using Hyperbrowser's native batch API.
 * Handles parallelization internally via the SDK.
 */
export async function scrapeBatch(urls: string[]): Promise<ScrapedContent[]> {
  try {
    const client = getClient();

    const result = await client.scrape.batch.startAndWait({
      urls,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    });

    const scrapedContent: ScrapedContent[] = [];

    if (result.data && Array.isArray(result.data)) {
      for (const item of result.data) {
        const url = item.url || "";
        const markdown = item.markdown || "";
        const success = markdown.length > 0;

        scrapedContent.push({
          url,
          markdown,
          success,
          error: success ? undefined : "No content extracted",
        });
      }
    }

    const successfulResults = scrapedContent.filter(
      (r) => r.success && r.markdown.length > 0
    );

    if (successfulResults.length === 0) {
      throw new Error("Failed to scrape any URLs successfully");
    }

    return successfulResults;
  } catch (error) {
    console.error("Batch scrape failed:", error);
    throw new Error(
      error instanceof Error ? error.message : "Batch scrape failed"
    );
  }
}
