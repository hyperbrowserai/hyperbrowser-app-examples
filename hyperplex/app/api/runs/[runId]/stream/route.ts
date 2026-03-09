import IORedis from "ioredis";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: { status: true },
  });

  if (!run) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If already terminal, send a single done event and close
  if (run.status === "completed" || run.status === "failed") {
    const body = `event: done\ndata: ${JSON.stringify({ status: run.status })}\n\n`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const subscriber = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: redisUrl.startsWith("rediss://") ? {} : undefined,
        retryStrategy: (times: number) => Math.min(times * 500, 5000),
      });

      subscriber.subscribe(`run:${runId}`).catch(() => {
        controller.close();
      });

      subscriber.on("message", (_channel: string, message: string) => {
        try {
          const parsed = JSON.parse(message);
          const eventType = parsed.event ?? "message";
          const line = `event: ${eventType}\ndata: ${message}\n\n`;
          controller.enqueue(encoder.encode(line));

          if (eventType === "done") {
            subscriber.disconnect();
            controller.close();
          }
        } catch {
          // Skip malformed messages
        }
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      // Cleanup on abort
      _req.signal?.addEventListener("abort", () => {
        clearInterval(heartbeat);
        subscriber.disconnect();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
