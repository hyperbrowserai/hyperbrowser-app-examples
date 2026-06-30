import { Hyperbrowser } from "@hyperbrowser/sdk";
import { normalizeUrl } from "@/lib/generateScript";
import type { RunStatus, RunStreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

type RunRequest = {
  task?: unknown;
  url?: unknown;
};

const encoder = new TextEncoder();

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "The run failed.";

  return message;
}

function writeEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: RunStreamEvent,
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

function coerceStatus(status: string | undefined): RunStatus {
  if (
    status === "completed" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "stopped"
  ) {
    return status;
  }

  return "failed";
}

export async function POST(request: Request) {
  let payload: RunRequest;

  try {
    payload = (await request.json()) as RunRequest;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const task = typeof payload.task === "string" ? payload.task.trim() : "";
  const url = typeof payload.url === "string" ? normalizeUrl(payload.url) : "";

  if (!task || !url) {
    return Response.json(
      { error: "Both task and starting URL are required." },
      { status: 400 },
    );
  }

  if (!process.env.HYPERBROWSER_API_KEY) {
    return Response.json(
      {
        error: "Missing HYPERBROWSER_API_KEY in .env.local.",
      },
      { status: 500 },
    );
  }

  const hyperbrowserApiKey = process.env.HYPERBROWSER_API_KEY;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        const client = new Hyperbrowser({ apiKey: hyperbrowserApiKey });
        let jobId: string | null = null;

        try {
          const started = await client.agents.hyperAgent.start({
            version: "1.1.0",
            task: `Start at ${url}. ${task}`,
            llm: "gpt-4o",
            maxSteps: 10,
            keepBrowserOpen: false,
            sessionOptions: {
              viewOnlyLiveView: true,
              screen: {
                width: 1280,
                height: 720,
              },
            },
          });

          jobId = started.jobId;

          if (!started.liveUrl) {
            throw new Error("Hyperbrowser did not return a Live View URL.");
          }

          writeEvent(controller, {
            type: "liveUrl",
            liveUrl: started.liveUrl,
          });

          let lastStepCount = 0;

          while (true) {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const result = await client.agents.hyperAgent.get(jobId);
            const stepCount =
              result.data?.steps?.length ??
              result.metadata?.numTaskStepsCompleted ??
              lastStepCount;

            if (stepCount !== lastStepCount) {
              lastStepCount = stepCount;
              writeEvent(controller, { type: "step", count: stepCount });
            }

            if (
              result.status === "completed" ||
              result.status === "failed" ||
              result.status === "stopped"
            ) {
              writeEvent(controller, {
                type: "done",
                status: coerceStatus(result.status),
                output: result.data?.finalResult ?? result.error ?? "",
                steps: stepCount,
              });

              break;
            }
          }
        } catch (error) {
          writeEvent(controller, {
            type: "error",
            message: errorMessage(error),
          });
        } finally {
          if (jobId) {
            try {
              await client.agents.hyperAgent.stop(jobId);
            } catch {
              // The task may already be completed or stopped.
            }
          }

          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
