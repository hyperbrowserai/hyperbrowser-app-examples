import { NextRequest, NextResponse } from "next/server";
import { capturePageScreenshot } from "@/lib/hyperbrowser";
import { generateVisionSkill } from "@/lib/anthropic";
import { GenerateResponse } from "@/types";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "Please provide a valid http(s) URL" },
        { status: 400 }
      );
    }

    console.log(`[vision] Capturing screenshot for ${url}`);
    const base64Screenshot = await capturePageScreenshot(url);

    console.log(`[vision] Generating SKILL.md with claude-opus-4-7`);
    const skillContent = await generateVisionSkill(url, base64Screenshot);

    const response: GenerateResponse = {
      content: skillContent,
      sources: [url],
      screenshots: [`data:image/png;base64,${base64Screenshot}`],
      metadata: {
        topic: url,
        scrapedCount: 1,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in /api/generate-vision:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
