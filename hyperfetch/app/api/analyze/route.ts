import { NextRequest } from "next/server";
import { fetchPage } from "@/lib/hyperbrowser";
import { enrich } from "@/lib/anthropic";
import type { StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function sseChunk(encoder: TextEncoder, event: StreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function isValidUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const url = body.url?.trim();
  if (!url || !isValidUrl(url)) {
    return new Response("Invalid URL", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(sseChunk(encoder, event));
      };

      try {
        send({ step: 1, message: "Fetching page..." });
        const page = await fetchPage(url);

        send({ step: 2, message: "Extracting content..." });
        const enriched = await enrich(url, page.markdown, page.metadata);

        send({ step: 3, message: "Structuring dataset..." });

        if ((!enriched.links.docs.length && !enriched.links.other.length) && page.links.length) {
          enriched.links.other = page.links.slice(0, 30);
        }

        send({ step: 4, message: "Done", result: enriched });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send({ step: -1, message: "Failed", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
