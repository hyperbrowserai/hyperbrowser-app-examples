import { Hyperbrowser } from "@hyperbrowser/sdk";
import { ScrapedContent } from "@/types";

export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const apiKey = process.env.HYPERBROWSER_API_KEY;

  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not configured");
  }

  try {
    const client = new Hyperbrowser({
      apiKey: apiKey,
    });

    const result = await client.scrape.startAndWait({
      url: url,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    });

    // Extract markdown content from the result
    const markdown = (result as any).data?.markdown || "";

    return {
      url,
      markdown,
      success: true,
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
  const scrapePromises = urls.map((url) => scrapeUrl(url));
  const results = await Promise.all(scrapePromises);

  // Filter out failed scrapes but keep at least some content
  const successfulResults = results.filter((r) => r.success && r.markdown.length > 0);

  if (successfulResults.length === 0) {
    throw new Error("Failed to scrape any URLs successfully");
  }

  return successfulResults;
}
