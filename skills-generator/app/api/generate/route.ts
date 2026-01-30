import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest, GenerateResponse } from "@/types";
import { searchWeb } from "@/lib/serper";
import { scrapeUrls, scrapeUrl } from "@/lib/hyperbrowser";
import { generateSkill } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { topic, url } = body;

    // Validate input
    if (!topic && !url) {
      return NextResponse.json(
        { error: "Either topic or url is required" },
        { status: 400 }
      );
    }

    let urls: string[] = [];
    let searchTopic = topic || url || "";

    // Step 1: Get URLs (either from search or direct URL)
    if (url) {
      // Direct URL provided
      urls = [url];
    } else if (topic) {
      // Search for URLs using Serper
      console.log(`Searching for: ${topic}`);
      const searchResults = await searchWeb(topic);
      urls = searchResults.map((result) => result.link);
      console.log(`Found ${urls.length} URLs`);
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No URLs found to scrape" },
        { status: 404 }
      );
    }

    // Step 2: Scrape URLs in parallel using Hyperbrowser
    console.log(`Scraping ${urls.length} URLs...`);
    const scrapedContent = await scrapeUrls(urls);
    console.log(`Successfully scraped ${scrapedContent.length} URLs`);

    if (scrapedContent.length === 0) {
      return NextResponse.json(
        { error: "Failed to scrape any content from the URLs" },
        { status: 500 }
      );
    }

    // Step 3: Generate SKILL.md using OpenAI
    console.log(`Generating SKILL.md for: ${searchTopic}`);
    const skillContent = await generateSkill(searchTopic, scrapedContent);

    // Step 4: Prepare response
    const response: GenerateResponse = {
      content: skillContent,
      sources: scrapedContent.map((content) => content.url),
      metadata: {
        topic: searchTopic,
        scrapedCount: scrapedContent.length,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in /api/generate:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
