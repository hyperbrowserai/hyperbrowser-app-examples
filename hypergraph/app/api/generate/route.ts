import { NextRequest, NextResponse } from "next/server";
import { searchDocs } from "@/lib/serper";
import { scrapeUrls, ConcurrencyPlanError } from "@/lib/hyperbrowser";
import { generateGraph } from "@/lib/generator";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic =
      typeof body.topic === "string" ? body.topic : "";
    const depth =
      typeof body.depth === "number" && Number.isFinite(body.depth)
        ? body.depth
        : 0;

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const urls = await searchDocs(topic.trim());
    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No documentation found for this topic" },
        { status: 404 }
      );
    }

    const docs = await scrapeUrls(urls);
    if (docs.length === 0) {
      return NextResponse.json(
        { error: "Failed to scrape any documentation" },
        { status: 502 }
      );
    }

    const { graph, files } = await generateGraph(topic.trim(), docs, depth);

    return NextResponse.json({ graph, files });
  } catch (err) {
    if (err instanceof ConcurrencyPlanError) {
      console.warn("[generate] Concurrency plan limit hit:", err.message);
      return NextResponse.json(
        {
          error: err.message,
          upgradeUrl: "https://hyperbrowser.ai",
          hint: "Set HYPERBROWSER_MAX_CONCURRENCY=1 in your .env (it is already the default) and ensure no other requests are running simultaneously.",
        },
        { status: 402 }
      );
    }
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
