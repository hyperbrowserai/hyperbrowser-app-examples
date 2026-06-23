// POST /api/brain  { url }
// Recall-or-learn. Streams newline-delimited JSON (NDJSON) events.
//   recall hit  -> a single { type: "result", source: "recall", ... } event, instantly.
//   learn miss  -> { type:"step" } / { type:"screenshot" } events, then the result.
// The recall path never screenshots or calls vision — that is the speed delta.

import { hasMemory, normalize, readMemory, writeMemory } from "@/lib/store";
import { scrapePage } from "@/lib/hyperbrowser";
import { analyze } from "@/lib/vision";
import type { BrainEvent, Memory } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let url: string;
  try {
    const body = await req.json();
    url = String(body.url ?? "");
    if (!url.trim()) throw new Error("missing url");
  } catch {
    return new Response(JSON.stringify({ error: "Provide a url" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { url: normUrl, domain } = normalize(url);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: BrainEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

      try {
        const started = Date.now();

        // RECALL PATH — fast. No screenshot, no vision.
        if (await hasMemory(domain)) {
          const memory = await readMemory(domain);
          send({
            type: "result",
            source: "recall",
            memory,
            learnedAt: memory.learnedAt,
            ms: Date.now() - started,
          });
          controller.close();
          return;
        }

        // LEARN PATH — slow, watchable.
        send({ type: "step", label: "Screenshotting the page" });
        const page = await scrapePage(normUrl);
        if (page.screenshot) send({ type: "screenshot", url: page.screenshot });

        send({ type: "step", label: "Reading it visually" });
        const vision = await analyze(page.screenshot, page.markdown);

        send({ type: "step", label: "Building memory" });
        const learnMs = Date.now() - started;
        const memory: Memory = {
          domain,
          url: normUrl,
          learnedAt: new Date().toISOString(),
          learnMs,
          screenshotUrl: page.screenshot,
          ...vision,
        };

        send({ type: "step", label: "Saving to brain" });
        await writeMemory(domain, memory);

        send({
          type: "result",
          source: "learn",
          memory,
          learnedAt: memory.learnedAt,
          ms: Date.now() - started,
        });
        controller.close();
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
