import type { NextRequest } from "next/server";
import {
  fetchCompanyHomepage,
  fetchEngineQuery,
} from "@/lib/hyperbrowser";
import { queryChatGPT } from "@/lib/openai";
import {
  analyzeEngineResults,
  generatePromptPlan,
  queryClaude,
} from "@/lib/anthropic";
import type {
  EngineKey,
  EngineQueryResult,
  Scorecard,
  SseEvent,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LIVE_ENGINES: EngineKey[] = ["chatgpt", "claude", "perplexity", "google"];

async function runEngineQuery(
  engine: EngineKey,
  prompt: string
): Promise<EngineQueryResult> {
  if (engine === "chatgpt") return queryChatGPT(prompt);
  if (engine === "claude") return queryClaude(prompt);
  return fetchEngineQuery(engine, prompt);
}

interface CacheEntry {
  cachedAt: number;
  scorecard: Scorecard;
}

const cache = new Map<string, CacheEntry>();
const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("URL is required");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const u = new URL(withScheme);
  u.hash = "";
  return u.toString().replace(/\/$/, "");
}

function cacheKey(url: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${url}::${day}`;
}

function sseEvent(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let normalized: string;
  try {
    normalized = normalizeUrl(body.url ?? "");
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "invalid URL" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: SseEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(sseEvent(event)));
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      const fail = (message: string) => {
        send({ type: "error", message, recoverable: false });
        finish();
      };

      try {
        const cached = cache.get(cacheKey(normalized));
        if (cached && Date.now() - cached.cachedAt < DAY_MS) {
          send({ type: "step", id: 5, label: "Loading cached scorecard…" });
          send({ type: "done", scorecard: cached.scorecard });
          finish();
          return;
        }

        send({ type: "step", id: 1, label: "Analyzing your website…" });
        const company = await fetchCompanyHomepage(normalized);

        send({ type: "step", id: 2, label: "Generating search prompts…" });
        const plan = await generatePromptPlan({
          url: normalized,
          markdown: company.markdown,
          title: company.title,
          description: company.description,
        });

        send({ type: "step", id: 3, label: "Querying AI engines…" });

        const tasks: { engine: EngineKey; prompt: string }[] = [];
        for (const prompt of plan.prompts) {
          for (const engine of LIVE_ENGINES) {
            tasks.push({ engine, prompt });
          }
        }

        const results: EngineQueryResult[] = [];
        const completedPerEngine: Record<EngineKey, number> = {
          chatgpt: 0,
          claude: 0,
          perplexity: 0,
          google: 0,
        };

        await Promise.all(
          tasks.map(async (t) => {
            const r = await runEngineQuery(t.engine, t.prompt);
            results.push(r);
            completedPerEngine[r.engine] += 1;
            send({
              type: "engine_progress",
              engine: r.engine,
              completed: completedPerEngine[r.engine],
              total: plan.prompts.length,
            });
          })
        );

        send({ type: "step", id: 4, label: "Analyzing responses…" });
        const scorecard = await analyzeEngineResults(
          {
            companyName: plan.companyName,
            competitors: plan.competitors,
            inputUrl: normalized,
            results,
          },
          plan
        );

        send({ type: "step", id: 5, label: "Building your scorecard…" });
        cache.set(cacheKey(normalized), {
          cachedAt: Date.now(),
          scorecard,
        });

        send({ type: "done", scorecard });
        finish();
      } catch (err) {
        const message = err instanceof Error ? err.message : "scan failed";
        fail(message);
      }
    },
    cancel() {
      // client disconnected — work continues briefly until the next checkpoint
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
