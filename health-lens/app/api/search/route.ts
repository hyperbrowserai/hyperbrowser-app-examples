import { NextRequest, NextResponse } from "next/server";
import { searchAllSources, type SearchResult } from "@/lib/hyperbrowser";

// Using Node.js runtime for Hyperbrowser SDK compatibility
export const maxDuration = 15; // Single PubMed search: 10s + buffer

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { terms } = body;

    if (!terms || !Array.isArray(terms) || terms.length === 0) {
      return NextResponse.json(
        { error: "Search terms are required" },
        { status: 400 }
      );
    }

    // Search all sources in parallel
    // Note: In a production environment with SSE, we would stream results here.
    // For now, we wait for all to complete but the client will simulate progress
    // or we could implement a streaming response if needed.
    const results: SearchResult[] = await searchAllSources(terms);

    return NextResponse.json({
      results,
      searchTerms: terms,
      timestamp: Date.now(),
      totalSources: results.length,
      totalStudies: results.reduce((acc, r) => acc + r.studies.length, 0),
    });
  } catch (error: any) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: error?.message || "Search failed" },
      { status: 500 }
    );
  }
}

