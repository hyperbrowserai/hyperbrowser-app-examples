import { runComputerUse, computerUseEvidence } from "@/lib/computer-use";
import { CONFIG } from "@/lib/config";
import { UsageMeter, callJson } from "@/lib/generate";
import { getHyperbrowser } from "@/lib/hyperbrowser";
import {
  domainKeyOf,
  emptyMemory,
  firstRecordedRun,
  graphDataOf,
  loadMemory,
  markFlowsReused,
  markNavPathsReused,
  markRepairsReused,
  markSelectorsReused,
  recordRun,
  rememberEnvFact,
  rememberFlow,
  rememberNavPath,
  rememberNote,
  rememberRepair,
  rememberSelector,
  saveMemory,
  statsOf,
  type DomainMemory,
  type EnvFactKind,
  type RepairMemory,
} from "@/lib/memory";
import {
  buildComputerUseTask,
  buildMemoryDeltaMessages,
  buildPlannerMessages,
  type MemoryDelta,
} from "@/lib/prompts";
import type { Emit, RunRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/i;
const ENV_FACT_KINDS = new Set<EnvFactKind>([
  "stealth_required",
  "captcha",
  "proxy_blocked",
  "login_required",
  "other",
]);

interface WriteCounts {
  selectors: number;
  navPaths: number;
  flows: number;
  notes: number;
  repairs: number;
  envFacts: number;
}

interface ReuseState {
  selectors: Set<string>;
  navPaths: Set<string>;
  flows: Set<string>;
  repairs: Map<string, RepairMemory>;
  staleSelectors: Set<string>;
}

interface ObservedState {
  selectors: Set<string>;
  navPaths: Set<string>;
  flows: Set<string>;
  notes: Set<string>;
  repairs: Set<string>;
  envFacts: Set<string>;
}

function resolveUrl(task: string, supplied?: string): string | null {
  const raw = supplied?.trim() || task.match(URL_PATTERN)?.[0];
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseAgentResult(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function hasMemory(memory: DomainMemory | null): memory is DomainMemory {
  return Boolean(
    memory &&
      (memory.runHistory.length ||
        memory.selectors.length ||
        memory.navPaths.length ||
        memory.flows.length ||
        memory.repairs.length ||
        memory.envFacts.length)
  );
}

function emptyCounts(): WriteCounts {
  return { selectors: 0, navPaths: 0, flows: 0, notes: 0, repairs: 0, envFacts: 0 };
}

function addCounts(total: WriteCounts, next: WriteCounts): void {
  for (const key of Object.keys(total) as Array<keyof WriteCounts>) total[key] += next[key];
}

/**
 * Merge only validated, bounded fields into the portable memory document.
 * The extractor can suggest facts; this boundary decides what is persisted.
 */
function applyMemoryDelta(
  memory: DomainMemory,
  delta: MemoryDelta,
  targetUrl: string,
  at: number,
  observed: ObservedState
): { counts: WriteCounts; labels: string[] } {
  const counts = emptyCounts();
  const labels: string[] = [];

  for (const entry of delta.selectors ?? []) {
    const selector = typeof entry.selector === "string" ? entry.selector.trim() : "";
    if (!selector || observed.selectors.has(selector)) continue;
    observed.selectors.add(selector);
    rememberSelector(
      memory,
      {
        selector,
        resolvedTo: entry.resolvedTo,
        purpose: entry.purpose,
        pageUrl: entry.pageUrl || targetUrl,
      },
      at
    );
    counts.selectors += 1;
    labels.push(selector);
  }

  for (const entry of delta.navPaths ?? []) {
    if (!entry?.goal || !Array.isArray(entry.urls) || !entry.urls.length) continue;
    const key = entry.urls.join(" > ");
    if (observed.navPaths.has(key)) continue;
    observed.navPaths.add(key);
    rememberNavPath(
      memory,
      { goal: entry.goal, urls: entry.urls, params: entry.params },
      at
    );
    counts.navPaths += 1;
    labels.push(entry.goal);
  }

  for (const entry of delta.flows ?? []) {
    if (!entry?.name || !Array.isArray(entry.steps) || !entry.steps.length) continue;
    const key = entry.name;
    if (observed.flows.has(key)) continue;
    observed.flows.add(key);
    rememberFlow(memory, { name: entry.name, steps: entry.steps }, at);
    counts.flows += 1;
    labels.push(entry.name);
  }

  if (typeof delta.structureNote === "string" && delta.structureNote.trim()) {
    if (!observed.notes.has(delta.structureNote)) {
      observed.notes.add(delta.structureNote);
      rememberNote(memory, { note: delta.structureNote, pageUrl: targetUrl }, at);
      counts.notes += 1;
    }
  }

  for (const entry of delta.repairs ?? []) {
    if (!entry?.error || !entry.fix) continue;
    const key = `${entry.error}|${entry.fix}`;
    if (observed.repairs.has(key)) continue;
    observed.repairs.add(key);
    rememberRepair(
      memory,
      { error: entry.error, failedApproach: entry.failedApproach ?? "", fix: entry.fix },
      at
    );
    counts.repairs += 1;
    labels.push(entry.error);
  }

  for (const entry of delta.envFacts ?? []) {
    if (!entry?.kind || !ENV_FACT_KINDS.has(entry.kind)) continue;
    const key = `${entry.kind}|${entry.detail ?? ""}`;
    if (observed.envFacts.has(key)) continue;
    observed.envFacts.add(key);
    rememberEnvFact(memory, { kind: entry.kind, detail: entry.detail ?? "" }, at);
    counts.envFacts += 1;
    labels.push(entry.kind.replaceAll("_", " "));
  }

  return { counts, labels };
}

function applyMeasuredReuse(
  memory: DomainMemory,
  prior: DomainMemory | null,
  delta: MemoryDelta,
  reuse: ReuseState
): void {
  if (!prior) return;

  const priorSelectors = new Set(prior.selectors.map((entry) => entry.selector));
  const selectors = (delta.reused?.selectors ?? []).filter(
    (value) => priorSelectors.has(value) && !reuse.selectors.has(value)
  );
  markSelectorsReused(memory, selectors);
  selectors.forEach((value) => reuse.selectors.add(value));

  const priorPaths = new Set(prior.navPaths.map((entry) => entry.goal));
  const paths = (delta.reused?.navPaths ?? []).filter(
    (value) => priorPaths.has(value) && !reuse.navPaths.has(value)
  );
  markNavPathsReused(memory, paths);
  paths.forEach((value) => reuse.navPaths.add(value));

  const priorFlows = new Set(prior.flows.map((entry) => entry.name));
  const flows = (delta.reused?.flows ?? []).filter(
    (value) => priorFlows.has(value) && !reuse.flows.has(value)
  );
  markFlowsReused(memory, flows);
  flows.forEach((value) => reuse.flows.add(value));

  const repairByKey = new Map(
    prior.repairs.map((entry) => [`${entry.error}|${entry.fix}`, entry])
  );
  const repairs = (delta.reused?.repairs ?? [])
    .map((entry) => repairByKey.get(`${entry.error ?? ""}|${entry.fix ?? ""}`))
    .filter(
      (entry): entry is RepairMemory =>
        Boolean(entry) && !reuse.repairs.has(`${entry?.error}|${entry?.fix}`)
    );
  markRepairsReused(memory, repairs);
  repairs.forEach((entry) => reuse.repairs.set(`${entry.error}|${entry.fix}`, entry));

  for (const selector of delta.staleSelectors ?? []) {
    if (!priorSelectors.has(selector)) continue;
    reuse.staleSelectors.add(selector);
    memory.selectors = memory.selectors.filter((entry) => entry.selector !== selector);
  }
}

export async function POST(request: Request): Promise<Response> {
  let input: RunRequest;
  try {
    input = (await request.json()) as RunRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const task = input.task?.trim();
  if (!task) return Response.json({ error: "Describe the browser task first." }, { status: 400 });

  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit: Emit = (event) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      void (async () => {
        const startedAt = Date.now();
        const meter = new UsageMeter();
        const retryNotice = (attempt: number, waitMs: number) =>
          emit({ t: "run", msg: `Anthropic retry ${attempt} in ${(waitMs / 1000).toFixed(1)}s` });

        try {
          emit({ t: "init", startedAt, model: CONFIG.model, task });
          const targetUrl = resolveUrl(task, input.url);
          if (!targetUrl) {
            emit({ t: "need_url" });
            return;
          }

          const domain = domainKeyOf(targetUrl);
          if (!domain) throw new Error("Could not resolve the target domain.");

          const client = getHyperbrowser();
          const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
          if (!anthropicApiKey) throw new Error("Missing ANTHROPIC_API_KEY.");

          emit({ t: "phase", phase: "remembering", at: Date.now() });
          const loaded = await loadMemory(domain);
          const prior = hasMemory(loaded) ? structuredClone(loaded) : null;
          const store = loaded ?? emptyMemory(domain);
          const memoryHit = hasMemory(loaded);
          emit({
            t: "memory",
            snapshot: {
              domain,
              hit: memoryHit,
              ...statsOf(store),
              graph: graphDataOf(store),
            },
            missReason: memoryHit ? null : "no_memory_file",
          });

          const plan = await callJson<{ allowed: boolean; reason: string; plan: string }>(
            buildPlannerMessages(task, targetUrl),
            meter,
            retryNotice
          );
          if (!plan.allowed) {
            emit({ t: "refused", reason: plan.reason || "This task is not supported." });
            return;
          }
          emit({ t: "plan", url: targetUrl, note: plan.plan });

          const totalWrites = emptyCounts();
          const observed: ObservedState = {
            selectors: new Set(),
            navPaths: new Set(),
            flows: new Set(),
            notes: new Set(),
            repairs: new Set(),
            envFacts: new Set(),
          };
          const reuse: ReuseState = {
            selectors: new Set(),
            navPaths: new Set(),
            flows: new Set(),
            repairs: new Map(),
            staleSelectors: new Set(),
          };

          const extractDelta = async (
            evidence: string,
            terminal: boolean,
            finalResult?: string
          ) => {
            if (!evidence.trim() && !finalResult?.trim()) return;
            try {
              emit({ t: "phase", phase: "learning", at: Date.now() });
              const delta = await callJson<MemoryDelta>(
                buildMemoryDeltaMessages({
                  task,
                  targetUrl,
                  memory: prior,
                  evidence,
                  finalResult,
                  terminal,
                }),
                meter,
                retryNotice
              );
              const learned = applyMemoryDelta(store, delta, targetUrl, Date.now(), observed);
              addCounts(totalWrites, learned.counts);
              applyMeasuredReuse(store, prior, delta, reuse);
              const memoryStats = statsOf(store);
              emit({
                t: "memory_learned",
                graph: graphDataOf(store),
                selectors: memoryStats.selectors,
                navPaths: memoryStats.navPaths,
                flows: memoryStats.flows,
                repairs: memoryStats.repairs,
                envFacts: memoryStats.envFacts,
                labels: learned.labels,
                stale: [...reuse.staleSelectors],
              });
              const reusedEntries = [
                ...reuse.selectors,
                ...reuse.navPaths,
                ...reuse.flows,
              ];
              if (reusedEntries.length) {
                emit({ t: "memory_reuse", entries: reusedEntries });
              }
              for (const repair of reuse.repairs.values()) {
                emit({ t: "memory_repair_applied", error: repair.error, fix: repair.fix });
              }
            } catch (error) {
              emit({ t: "run", msg: `Memory extraction skipped: ${messageOf(error)}` });
            } finally {
              emit({ t: "phase", phase: "running", at: Date.now() });
            }
          };

          emit({ t: "phase", phase: "running", at: Date.now() });
          const outcome = await runComputerUse(client, {
            task: buildComputerUseTask(task, targetUrl, prior),
            anthropicApiKey,
            emit,
            isCancelled: () => closed,
            onNewSteps: async (steps) => {
              await extractDelta(computerUseEvidence(steps), false);
            },
          });

          meter.addCounts(outcome.inputTokens, outcome.outputTokens);
          await extractDelta(
            computerUseEvidence(outcome.steps),
            true,
            outcome.finalResult
          );

          const elapsedMs = Date.now() - startedAt;
          const usage = meter.snapshot();
          const first = firstRecordedRun(store);
          const record = {
            at: Date.now(),
            task,
            ok: outcome.ok,
            steps: outcome.steps.length,
            elapsedMs,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            repaired: false,
            memoryUsed: memoryHit,
            selectorsReused:
              reuse.selectors.size + reuse.navPaths.size + reuse.flows.size + reuse.repairs.size,
          };
          recordRun(store, record);

          const saved = await saveMemory(store);
          if (saved) {
            emit({
              t: "memory_write",
              ...totalWrites,
              graph: graphDataOf(store),
              bytes: saved.bytes,
              pruned: saved.pruned,
              created: !loaded,
            });
          }
          if (first) {
            emit({
              t: "memory_comparison",
              comparison: {
                first: {
                  at: first.at,
                  steps: first.steps,
                  elapsedMs: first.elapsedMs,
                  inputTokens: first.inputTokens,
                  outputTokens: first.outputTokens,
                },
                current: {
                  steps: record.steps,
                  elapsedMs: record.elapsedMs,
                  inputTokens: record.inputTokens,
                  outputTokens: record.outputTokens,
                },
              },
            });
          }

          emit({
            t: "result",
            result: {
              data: parseAgentResult(outcome.finalResult),
              steps: outcome.stepLabels,
            },
          });
          emit({ t: "usage", usage });
          emit({ t: "done", elapsedMs, ok: outcome.ok });
          if (!outcome.ok) emit({ t: "error", message: outcome.error ?? "Agent run failed." });
        } catch (error) {
          emit({ t: "usage", usage: meter.snapshot() });
          emit({ t: "error", message: messageOf(error) });
        } finally {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }
      })();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
