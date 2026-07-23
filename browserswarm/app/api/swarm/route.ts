import type { NextRequest } from "next/server";
import { runSwarm } from "@/lib/orchestrator";
import type { SwarmEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Single streaming request. The swarm runs inside this request's scope and
 * pushes NDJSON events (one JSON object per line) as they happen; the client
 * reads them off the response body. No shared server state, no polling.
 */
export async function POST(req: NextRequest) {
  let body: { question?: string; seeds?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  const seeds = Array.isArray(body.seeds) ? body.seeds : [];
  if (!question) return Response.json({ error: "Question is required" }, { status: 400 });
  if (seeds.length === 0) return Response.json({ error: "At least one seed URL is required" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (e: SwarmEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          closed = true; // client went away
        }
      };
      try {
        await runSwarm({ question, seeds }, emit, req.signal);
      } catch (err) {
        emit({ t: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
