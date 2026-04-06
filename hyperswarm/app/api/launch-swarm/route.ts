import type { BrowserUseLlm } from "@hyperbrowser/sdk/types";
import { getHyperbrowser } from "@/lib/hyperbrowser";
import { rankSnippets } from "@/lib/rank";
import {
  buildBrowserTask,
  collectUrlsFromSteps,
  extractLastPageUrlFromTask,
  extractLastScreenshotForClient,
  extractStepLabel,
} from "@/lib/swarm-server";
import { synthesizeSwarm } from "@/lib/synthesize";
import type {
  AgentResult,
  RankedResult,
  RawAgentSnippet,
  SubTask,
  SwarmEvent,
} from "@/lib/types";
import { sseData } from "@/lib/types";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const AGENT_LLMS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-5",
  "gpt-5-mini",
  "claude-sonnet-4-5",
  "claude-sonnet-4-6",
  "claude-sonnet-4-20250514",
  "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
] as const satisfies readonly BrowserUseLlm[];

const subtaskSchema = z.object({
  task: z.string(),
  url: z.string(),
  extractionGoal: z.string(),
  siteName: z.string(),
});

const bodySchema = z.object({
  goal: z.string().min(4).max(4000),
  subtasks: z.array(subtaskSchema).min(1).max(20),
  maxAgents: z.number().int().min(1).max(20),
  maxSteps: z.number().int().min(5).max(60).default(25),
  timeoutSeconds: z.number().int().min(30).max(300).default(180),
  useStealth: z.boolean().default(true),
  useProxy: z.boolean().default(true),
  solveCaptchas: z.boolean().default(true),
  agentLlm: z.enum(AGENT_LLMS).default("gpt-5-mini"),
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: Request) {
  const signal = request.signal;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const {
    goal,
    subtasks,
    maxAgents,
    maxSteps,
    timeoutSeconds,
    useStealth,
    useProxy,
    solveCaptchas,
    agentLlm,
  } = parsed.data;

  const trimmed: SubTask[] = subtasks.slice(0, maxAgents);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: SwarmEvent) => {
        controller.enqueue(encoder.encode(sseData(event)));
      };

      const activeJobIds: string[] = [];
      const onAbort = () => {
        const client = getHyperbrowser();
        for (const id of activeJobIds) {
          void client.agents.browserUse.stop(id);
        }
      };
      signal.addEventListener("abort", onAbort);

      const startTime = Date.now();
      const allUrls = new Set<string>();
      const rawSnippets: RawAgentSnippet[] = [];
      let lastRanked: RankedResult[] = [];
      let rankTimer: ReturnType<typeof setTimeout> | null = null;

      const flushRank = async () => {
        if (rawSnippets.length === 0) return;
        try {
          const { ranked, duplicatesRemoved } = await rankSnippets([...rawSnippets]);
          lastRanked = ranked;
          send({ type: "result_ranked", rankedResults: ranked, duplicatesRemoved });
        } catch {
          /* ignore ranking errors */
        }
      };

      const scheduleRank = () => {
        if (rankTimer) clearTimeout(rankTimer);
        rankTimer = setTimeout(() => {
          rankTimer = null;
          void flushRank();
        }, 450);
      };

      const useByok = process.env.HYPERBROWSER_BROWSER_USE_BYOK === "1";

      try {
        send({ type: "subtasks_ready", subtasks: trimmed });

        const runAgent = async (index: number, subtask: SubTask) => {
          await sleep(index * 80);
          if (signal.aborted) return null;

          const hb = getHyperbrowser();
          let jobId: string;
          const timeoutMinutes = Math.min(
            720,
            Math.max(1, Math.ceil(timeoutSeconds / 60)),
          );

          try {
            const started = await hb.agents.browserUse.start({
              task: buildBrowserTask(subtask),
              llm: agentLlm,
              maxSteps,
              // Single start call (no separate sessions.create) — faster launches at scale.
              // keepBrowserOpen helps live view after the task ends. Vision off = faster steps.
              keepBrowserOpen: true,
              sessionOptions: {
                useStealth,
                useProxy,
                solveCaptchas,
                viewOnlyLiveView: true,
                timeoutMinutes,
                acceptCookies: true,
                liveViewTtlSeconds: 3600,
              },
              useCustomApiKeys: useByok,
              apiKeys:
                useByok && process.env.OPENAI_API_KEY
                  ? { openai: process.env.OPENAI_API_KEY }
                  : undefined,
            });
            jobId = started.jobId;
            activeJobIds.push(jobId);
            const initialLive = started.liveUrl ?? "";
            send({
              type: "agent_launched",
              index,
              siteName: subtask.siteName,
              liveUrl: initialLive,
              jobId,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Launch failed";
            send({ type: "agent_failed", index, error: msg });
            const failResult: AgentResult = {
              subtaskIndex: index,
              siteName: subtask.siteName,
              result: null,
              status: "failed",
              error: msg,
            };
            send({ type: "agent_result", index, result: failResult });
            send({ type: "agent_complete", index });
            return failResult;
          }

          const deadline = Date.now() + timeoutSeconds * 1000;
          let lastPushedLive = "";

          try {
            let firstPoll = true;
            while (!signal.aborted) {
              if (Date.now() > deadline) {
                await hb.agents.browserUse.stop(jobId).catch(() => {});
                break;
              }
              if (!firstPoll) await sleep(2000);
              firstPoll = false;
              if (signal.aborted) break;
              const full = await hb.agents.browserUse.get(jobId);
              const steps = full.data?.steps ?? [];
              collectUrlsFromSteps(full.data).forEach((u) => allUrls.add(u));

              if (full.liveUrl && full.liveUrl !== lastPushedLive) {
                lastPushedLive = full.liveUrl;
                send({
                  type: "agent_live_refresh",
                  index,
                  liveUrl: full.liveUrl,
                });
              }

              if (
                full.status === "completed" ||
                full.status === "failed" ||
                full.status === "stopped"
              ) {
                const nextLive = full.liveUrl ?? null;
                if (nextLive && nextLive !== lastPushedLive) {
                  lastPushedLive = nextLive;
                  send({
                    type: "agent_live_refresh",
                    index,
                    liveUrl: nextLive,
                  });
                }
                const frameSrc = extractLastScreenshotForClient(full.data);
                const lastPageUrl = extractLastPageUrlFromTask(full.data);
                if (frameSrc || lastPageUrl) {
                  send({
                    type: "agent_final_frame",
                    index,
                    frameSrc: frameSrc || undefined,
                    lastPageUrl: lastPageUrl || undefined,
                  });
                }
                const ok = full.status === "completed";
                const text = full.data?.finalResult ?? "";
                const result: AgentResult = {
                  subtaskIndex: index,
                  siteName: subtask.siteName,
                  result: ok ? text : null,
                  status: ok ? "completed" : full.status === "stopped" ? "stopped" : "failed",
                  error: full.error ?? undefined,
                };
                send({
                  type: "agent_progress",
                  index,
                  status: ok ? "Complete" : "Finished",
                  progress: 100,
                });
                send({ type: "agent_result", index, result });
                if (ok && text.trim()) {
                  rawSnippets.push({
                    subtaskIndex: index,
                    siteName: subtask.siteName,
                    text,
                  });
                  scheduleRank();
                }
                send({ type: "agent_complete", index });
                return result;
              }

              const progress = Math.min(
                92,
                (steps.length / Math.max(1, maxSteps)) * 100,
              );
              const label =
                steps.length > 0
                  ? extractStepLabel(steps[steps.length - 1])
                  : "Starting";
              send({ type: "agent_progress", index, status: label, progress });
            }

            if (signal.aborted) {
              await hb.agents.browserUse.stop(jobId).catch(() => {});
              const result: AgentResult = {
                subtaskIndex: index,
                siteName: subtask.siteName,
                result: null,
                status: "stopped",
                error: "Aborted",
              };
              send({ type: "agent_result", index, result });
              send({ type: "agent_complete", index });
              return result;
            }

            const full = await hb.agents.browserUse.get(jobId);
            const nextLive = full.liveUrl ?? null;
            if (nextLive && nextLive !== lastPushedLive) {
              lastPushedLive = nextLive;
              send({
                type: "agent_live_refresh",
                index,
                liveUrl: nextLive,
              });
            }
            const frameSrcT = extractLastScreenshotForClient(full.data);
            const lastPageUrlT = extractLastPageUrlFromTask(full.data);
            if (frameSrcT || lastPageUrlT) {
              send({
                type: "agent_final_frame",
                index,
                frameSrc: frameSrcT || undefined,
                lastPageUrl: lastPageUrlT || undefined,
              });
            }
            const text = full.data?.finalResult ?? "";
            // Wall-clock limit hit while Hyperbrowser still had the task running.
            // If the agent already produced a final answer, treat as success so the UI
            // does not show a false "hard failure" (red/X) when there is usable output.
            if (text.trim()) {
              const result: AgentResult = {
                subtaskIndex: index,
                siteName: subtask.siteName,
                result: text,
                status: "completed",
              };
              send({
                type: "agent_progress",
                index,
                status: "Finished (time limit)",
                progress: 100,
              });
              send({ type: "agent_result", index, result });
              rawSnippets.push({
                subtaskIndex: index,
                siteName: subtask.siteName,
                text,
              });
              scheduleRank();
              send({ type: "agent_complete", index });
              return result;
            }
            const result: AgentResult = {
              subtaskIndex: index,
              siteName: subtask.siteName,
              result: null,
              status: "failed",
              error: "Timeout",
            };
            send({ type: "agent_failed", index, error: "Timeout" });
            send({ type: "agent_result", index, result });
            send({ type: "agent_complete", index });
            return result;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Agent error";
            await hb.agents.browserUse.stop(jobId).catch(() => {});
            const result: AgentResult = {
              subtaskIndex: index,
              siteName: subtask.siteName,
              result: null,
              status: "failed",
              error: msg,
            };
            send({ type: "agent_failed", index, error: msg });
            send({ type: "agent_result", index, result });
            send({ type: "agent_complete", index });
            return result;
          }
        };

        const outcomes = await Promise.all(
          trimmed.map((st, i) => runAgent(i, st)),
        );

        if (rankTimer) {
          clearTimeout(rankTimer);
          rankTimer = null;
        }
        await flushRank();

        const agentResults = outcomes.filter(Boolean) as AgentResult[];

        send({ type: "synthesizing" });

        const durationMs = Date.now() - startTime;
        let synthesisPayload: Awaited<ReturnType<typeof synthesizeSwarm>>;
        try {
          synthesisPayload = await synthesizeSwarm(
            goal,
            agentResults,
            lastRanked,
            {
              agentsCount: trimmed.length,
              sitesVisited: allUrls.size,
              resultsCount: lastRanked.length,
              durationMs,
            },
          );
        } catch (synErr) {
          const msg =
            synErr instanceof Error ? synErr.message : "Synthesis failed";
          send({ type: "error", message: msg });
          return;
        }

        const { synthesis, rankedResults } = synthesisPayload;

        send({
          type: "complete",
          synthesis: {
            ...synthesis,
            resultsCount: rankedResults.length,
            sitesVisited: allUrls.size,
            agentsCount: trimmed.length,
            durationMs,
          },
          rankedResults,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Swarm failed";
        send({ type: "error", message });
      } finally {
        signal.removeEventListener("abort", onAbort);
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
