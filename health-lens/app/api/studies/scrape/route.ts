import { NextRequest, NextResponse } from "next/server";
import { scrapePubMedArticle } from "@/lib/hyperbrowser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, pmid } = body;

    if (!url && !pmid) {
      return NextResponse.json({ error: "URL or PMID is required" }, { status: 400 });
    }

    // Extract PMID from URL if not provided directly
    const articlePmid = pmid || url?.match(/\/(\d{7,8})\/?/)?.[1];
    
    if (!articlePmid) {
      return NextResponse.json(
        { error: "Could not extract PMID from URL" },
        { status: 400 }
      );
    }

    // Scrape the PubMed article using Hyperbrowser
    const scrapedData = await scrapePubMedArticle(articlePmid);

    if (!scrapedData) {
      return NextResponse.json(
        { error: "Failed to scrape study" },
        { status: 500 }
      );
    }

    return NextResponse.json(scrapedData);
  } catch (error) {
    console.error("Error scraping study:", error);
    return NextResponse.json(
      { error: "Failed to scrape study" },
      { status: 500 }
    );
  }
}
