import { executeMineRun } from "@/lib/mine-runner";
import type { MineRunEvent } from "@/lib/run-events";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: MineRunEvent) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      try {
        const run = await executeMineRun(body, { emit: send });

        if (!run.ok) {
          send({
            type: "run_failed",
            message: run.error,
          });
        }
      } catch (error) {
        send({
          type: "run_failed",
          message:
            error instanceof Error
              ? error.message
              : "Unable to stream mining run.",
        });
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
    },
  });
}

function encodeSseEvent(event: MineRunEvent): string {
  return `event: mine\ndata: ${JSON.stringify(event)}\n\n`;
}
