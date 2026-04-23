import { NextRequest, NextResponse } from "next/server";
import { captureScreenshots, scrapePageForDesign } from "@/lib/hyperbrowser";
import { generateDesignMdStream } from "@/lib/anthropic";
import { parseDesignFrontmatter } from "@/lib/design-md";

/** Extract a short headline and a body snippet from scraped markdown. */
function extractPageCopy(md: string): { heading: string; body: string } {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);

  const headingLine = lines.find((l) => /^#{1,3}\s/.test(l));
  const heading = headingLine
    ? headingLine.replace(/^#{1,3}\s+/, "").replace(/\*\*/g, "").slice(0, 80)
    : "";

  const bodyLine = lines.find(
    (l) =>
      !l.startsWith("#") &&
      !l.startsWith(">") &&
      !l.startsWith("-") &&
      !l.startsWith("*") &&
      !l.startsWith("|") &&
      !l.startsWith("!") &&
      !l.startsWith("[") &&
      l.length > 40
  );
  const body = bodyLine ? bodyLine.replace(/\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, "").slice(0, 120) : "";

  return { heading, body };
}

export const maxDuration = 120; // Allow up to 2 minutes for the entire process

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };

        try {
          send({ type: "step", step: 0 });

          const [screenshots, scrapedMarkdown] = await Promise.all([
            captureScreenshots(url),
            scrapePageForDesign(url),
          ]);

          send({ type: "screenshot", data: screenshots.viewport });
          send({ type: "fullpage", data: screenshots.fullPage });
          send({ type: "step", step: 1 });

          const designMd = await generateDesignMdStream(url, screenshots.viewport, scrapedMarkdown, (chunk) => {
            send({ type: "chunk", text: chunk });
          });
          const { tokens } = parseDesignFrontmatter(designMd);
          const pageCopy = extractPageCopy(scrapedMarkdown);

          send({ type: "result", designMd, tokens, pageCopy });
        } catch (error) {
          console.error("[hyperdesign] /api/generate stream error:", error);
          send({
            type: "error",
            error: error instanceof Error ? error.message : "An unknown error occurred",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[hyperdesign] /api/generate:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
