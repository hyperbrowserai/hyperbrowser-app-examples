import { NextRequest, NextResponse } from "next/server";
import { searchPubMedAPI, SearchResult } from "@/lib/hyperbrowser";

// Pre-scrape trending health topics for quick access
export const maxDuration = 30;

const TRENDING_HEALTH_TOPICS = [
  "blood glucose diabetes management 2024",
  "cholesterol heart disease prevention",
  "vitamin D deficiency symptoms treatment",
  "complete blood count interpretation",
  "thyroid function test results",
];

export async function GET(req: NextRequest) {
  try {
    // Get optional topic from query params
    const { searchParams } = new URL(req.url);
    const customTopic = searchParams.get("topic");
    
    const topics = customTopic 
      ? [customTopic] 
      : TRENDING_HEALTH_TOPICS.slice(0, 2); // Default to 2 topics for speed
    
    const results: SearchResult[] = [];
    
    for (const topic of topics) {
      console.log(`🔄 Pre-scraping: ${topic}`);
      
      const studies = await searchPubMedAPI(topic);
      
      results.push({
        source: "PubMed",
        studies,
        searchTerms: [topic],
        timestamp: Date.now(),
      });
      
      console.log(`✅ Pre-scraped ${studies.length} studies for: ${topic}`);
    }
    
    return NextResponse.json({
      success: true,
      results,
      totalStudies: results.reduce((acc, r) => acc + r.studies.length, 0),
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Pre-scrape error:", error);
    return NextResponse.json(
      { error: error?.message || "Pre-scrape failed" },
      { status: 500 }
    );
  }
}
