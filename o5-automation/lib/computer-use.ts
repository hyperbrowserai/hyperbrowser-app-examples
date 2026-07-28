import type { Hyperbrowser } from "@hyperbrowser/sdk";
import type {
  ClaudeComputerUseStepResponse,
  ClaudeComputerUseTaskResponse,
  StartClaudeComputerUseTaskParams,
} from "@hyperbrowser/sdk/types";
import { CONFIG } from "./config";
import type { Emit } from "./types";

type HyperbrowserClient = Hyperbrowser;

export interface ComputerUseOutcome {
  jobId: string;
  ok: boolean;
  status: ClaudeComputerUseTaskResponse["status"];
  finalResult: string;
  steps: ClaudeComputerUseStepResponse[];
  stepLabels: string[];
  inputTokens: number;
  outputTokens: number;
  error: string | null;
}

interface RunComputerUseOptions {
  task: string;
  anthropicApiKey: string;
  emit: Emit;
  isCancelled: () => boolean;
  onNewSteps?: (
    steps: ClaudeComputerUseStepResponse[],
    allSteps: ClaudeComputerUseStepResponse[]
  ) => Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compact(value: unknown, cap = 180): string {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim().slice(0, cap);
  try {
    return JSON.stringify(value).slice(0, cap);
  } catch {
    return "";
  }
}

/** Reduce one SDK step to a readable, screenshot-free activity label. */
export function labelComputerUseStep(step: ClaudeComputerUseStepResponse): string {
  for (const block of Array.isArray(step.content) ? step.content : []) {
    if (!block || typeof block !== "object") continue;
    const record = block as Record<string, unknown>;
    if (record.type === "text" && typeof record.text === "string") {
      const text = compact(record.text);
      if (text) return text;
    }
    if (record.type === "tool_use") {
      const name = typeof record.name === "string" ? record.name : "computer";
      const input = compact(record.input, 120);
      return input ? `${name}: ${input}` : name;
    }
  }
  return `${step.role || "agent"} ${step.type || "step"}`.trim();
}

/**
 * Serialize only textual/tool evidence. Screenshot blocks can be huge and are
 * not needed by the memory extractor.
 */
export function computerUseEvidence(steps: ClaudeComputerUseStepResponse[]): string {
  return steps
    .map((step, index) => {
      const blocks: Array<Record<string, unknown>> = [];
      for (const block of Array.isArray(step.content) ? step.content : []) {
          if (!block || typeof block !== "object") continue;
          const record = block as Record<string, unknown>;
          if (record.type === "text" && typeof record.text === "string") {
            blocks.push({ type: "text", text: compact(record.text, 1_500) });
            continue;
          }
          if (record.type === "tool_use") {
            blocks.push({
              type: "tool_use",
              name: compact(record.name, 80),
              input: compact(record.input, 1_000),
            });
            continue;
          }
          if (record.type === "tool_result") {
            blocks.push({
              type: "tool_result",
              content: compact(record.content, 1_000),
              isError: Boolean(record.is_error),
            });
          }
      }
      return JSON.stringify({
        step: index + 1,
        role: step.role,
        type: step.type,
        stopReason: step.stop_reason,
        blocks,
      });
    })
    .join("\n");
}

/**
 * Run Claude Computer Use through the installed official Hyperbrowser SDK.
 * The model value is supported by the live API/docs but not yet present in the
 * v0.90.4 string union, so the cast is intentionally limited to this boundary.
 */
export async function runComputerUse(
  client: HyperbrowserClient,
  options: RunComputerUseOptions
): Promise<ComputerUseOutcome> {
  const params = {
    task: options.task,
    llm: CONFIG.model as StartClaudeComputerUseTaskParams["llm"],
    maxSteps: CONFIG.computerUseMaxSteps,
    maxFailures: CONFIG.computerUseMaxFailures,
    useComputerAction: true,
    keepBrowserOpen: false,
    useCustomApiKeys: true,
    apiKeys: { anthropic: options.anthropicApiKey },
    sessionOptions: {
      viewOnlyLiveView: true,
      timeoutMinutes: CONFIG.computerUseTimeoutMinutes,
    },
  } satisfies StartClaudeComputerUseTaskParams;

  const started = await client.agents.claudeComputerUse.start(params);
  options.emit({ t: "live", url: started.liveUrl, label: "Claude Computer Use" });
  options.emit({ t: "run", msg: `Claude Computer Use job ${started.jobId} started` });

  let seenSteps = 0;
  let result: ClaudeComputerUseTaskResponse | null = null;
  let consecutivePollFailures = 0;

  while (!result) {
    if (options.isCancelled()) {
      await client.agents.claudeComputerUse.stop(started.jobId).catch(() => undefined);
      throw new Error("Run cancelled.");
    }

    try {
      const current = await client.agents.claudeComputerUse.get(started.jobId);
      consecutivePollFailures = 0;
      const allSteps = current.data?.steps ?? [];
      if (allSteps.length > seenSteps) {
        const additions = allSteps.slice(seenSteps);
        seenSteps = allSteps.length;
        for (const step of additions) {
          options.emit({ t: "step", label: labelComputerUseStep(step) });
        }
        await options.onNewSteps?.(additions, allSteps);
      }

      if (
        current.status === "completed" ||
        current.status === "failed" ||
        current.status === "stopped"
      ) {
        result = current;
        break;
      }
    } catch (error) {
      consecutivePollFailures += 1;
      if (consecutivePollFailures >= CONFIG.computerUseMaxPollFailures) throw error;
      options.emit({
        t: "run",
        msg: `Computer Use status retry ${consecutivePollFailures}/${CONFIG.computerUseMaxPollFailures}`,
      });
    }

    await sleep(CONFIG.computerUsePollMs);
  }

  const steps = result.data?.steps ?? [];
  return {
    jobId: started.jobId,
    ok: result.status === "completed",
    status: result.status,
    finalResult: result.data?.finalResult ?? "",
    steps,
    stepLabels: steps.map(labelComputerUseStep),
    inputTokens: result.metadata?.inputTokens ?? 0,
    outputTokens: result.metadata?.outputTokens ?? 0,
    error: result.error ?? (result.status === "completed" ? null : `Task ${result.status}.`),
  };
}
