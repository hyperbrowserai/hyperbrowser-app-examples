import { getHyperbrowser } from "./hyperbrowser";
import { judgeResults } from "./judge";
import { scans } from "./store";
import type { AgentName } from "./types";

interface AgentRunOutcome {
  status: "completed" | "failed";
  output?: string;
  steps?: number;
  error?: string;
}

function safeOutcome(
  result: {
    data?: { finalResult?: string | null; steps?: unknown[] } | null;
    error?: string | null;
    status?: string;
  } | null
): AgentRunOutcome {
  if (!result) return { status: "failed", error: "No result returned" };
  if (result.error) {
    return { status: "failed", error: result.error };
  }
  return {
    status: "completed",
    output: result.data?.finalResult ?? "No output",
    steps: Array.isArray(result.data?.steps) ? result.data!.steps!.length : 0,
  };
}

export function runAgentsInBackground(
  scanId: string,
  url: string,
  task: string,
  sessionIds: Record<AgentName, string>
): void {
  const client = getHyperbrowser();
  const fullTask = `Go to ${url} and ${task}`;
  const now = () => Date.now();

  const scan = scans.get(scanId);
  if (!scan) return;
  for (const name of Object.keys(sessionIds) as AgentName[]) {
    scan.results[name] = { status: "running", startedAt: now() };
  }

  const calls: { name: AgentName; promise: Promise<unknown> }[] = [
    {
      name: "claude",
      promise: client.agents.claudeComputerUse.startAndWait({
        task: fullTask,
        sessionId: sessionIds.claude,
        maxSteps: 25,
      }),
    },
    {
      name: "openai",
      promise: client.agents.cua.startAndWait({
        task: fullTask,
        sessionId: sessionIds.openai,
        maxSteps: 25,
        sessionOptions: { acceptCookies: true },
      }),
    },
    {
      name: "gemini",
      promise: client.agents.geminiComputerUse.startAndWait({
        task: fullTask,
        sessionId: sessionIds.gemini,
        maxSteps: 25,
      }),
    },
  ];

  for (const call of calls) {
    call.promise
      .then((raw) => {
        const outcome = safeOutcome(raw as Parameters<typeof safeOutcome>[0]);
        const s = scans.get(scanId);
        if (!s) return;
        s.results[call.name] = {
          ...(s.results[call.name] ?? { startedAt: now() }),
          status: outcome.status,
          output: outcome.output,
          steps: outcome.steps,
          error: outcome.error,
          completedAt: now(),
        };
      })
      .catch((err: unknown) => {
        const s = scans.get(scanId);
        if (!s) return;
        s.results[call.name] = {
          ...(s.results[call.name] ?? { startedAt: now() }),
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          completedAt: now(),
        };
      });
  }

  Promise.allSettled(calls.map((c) => c.promise))
    .then(async () => {
      const s = scans.get(scanId);
      if (!s) return;
      s.status = "judging";
      try {
        s.scorecard = await judgeResults(s);
        s.status = "complete";
      } catch (err) {
        s.status = "error";
        s.error = err instanceof Error ? err.message : String(err);
      }
      await Promise.all(
        Object.values(sessionIds).map((sid) =>
          client.sessions.stop(sid).catch(() => undefined)
        )
      );
    })
    .catch(() => undefined);
}
