import { getRun, subscribe, isTerminal } from "@/lib/store";
import type { AgentEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// Server-Sent Events stream of a run's events. Replays the existing event log
// (so late subscribers don't miss anything), then pushes new events live.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = getRun(id);

  if (!run) {
    return new Response("Run not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: AgentEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Replay buffered events.
      for (const ev of run.events) send(ev);

      // If the run already finished, close out.
      if (isTerminal(id)) {
        controller.enqueue(encoder.encode("event: end\ndata: {}\n\n"));
        controller.close();
        return;
      }

      const unsubscribe = subscribe(id, (event) => {
        send(event);
        if (event.type === "done" || event.type === "error") {
          try {
            controller.enqueue(encoder.encode("event: end\ndata: {}\n\n"));
          } catch {
            /* ignore */
          }
          cleanup();
          try {
            controller.close();
          } catch {
            /* ignore */
          }
        }
      });

      // Heartbeat to keep the connection alive through proxies.
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);

      function cleanup() {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
      }

      req.signal?.addEventListener?.("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
