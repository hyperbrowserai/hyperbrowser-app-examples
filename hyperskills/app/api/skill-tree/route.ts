import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest } from "@/types";
import { searchWeb } from "@/lib/serper";
import { scrapeUrls } from "@/lib/hyperbrowser";
import { generateSkillTree } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { topic, url } = body;

    if (!topic && !url) {
      return NextResponse.json(
        { error: "Either topic or url is required" },
        { status: 400 }
      );
    }

    let urls: string[] = [];
    const searchTopic = topic || url || "";

    if (url) {
      urls = [url];
    } else if (topic) {
      console.log(`[skill-tree] Searching for: ${topic}`);
      const searchResults = await searchWeb(
        `${topic} official documentation API reference`
      );
      urls = searchResults.map((result) => result.link);
      console.log(`[skill-tree] Found ${urls.length} URLs`);
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No URLs found to scrape" },
        { status: 404 }
      );
    }

    console.log(`[skill-tree] Scraping ${urls.length} URLs...`);
    const scrapedContent = await scrapeUrls(urls);
    console.log(
      `[skill-tree] Successfully scraped ${scrapedContent.length} URLs`
    );

    if (scrapedContent.length === 0) {
      return NextResponse.json(
        { error: "Failed to scrape any content from the URLs" },
        { status: 500 }
      );
    }

    console.log(`[skill-tree] Generating skill tree for: ${searchTopic}`);
    const tree = await generateSkillTree(searchTopic, scrapedContent);

    return NextResponse.json({
      tree,
      sources: scrapedContent.map((c) => c.url),
    });
  } catch (error) {
    console.error("Error in /api/skill-tree:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
