import type { AgentEvent, RunRecord, RunStatus } from "./types";

// In-memory store of runs keyed by runId. Each run keeps its full event log so
// a client that connects to the SSE stream slightly late still gets every event,
// plus a set of live subscribers for real-time pushes.

type Subscriber = (event: AgentEvent) => void;

interface RunEntry {
  record: RunRecord;
  subscribers: Set<Subscriber>;
}

declare global {
  // Persist across hot reloads / route module instances in dev.
  var __hyperviewRuns: Map<string, RunEntry> | undefined;
}

const runs: Map<string, RunEntry> =
  globalThis.__hyperviewRuns ?? (globalThis.__hyperviewRuns = new Map());

export function createRun(id: string, task: string, image: string): RunRecord {
  const record: RunRecord = {
    id,
    task,
    status: "booting",
    sandboxId: null,
    image,
    bootMs: null,
    createdAt: Date.now(),
    events: [],
    liveUrl: null,
    summary: null,
    error: null,
  };
  runs.set(id, { record, subscribers: new Set() });
  return record;
}

export function getRun(id: string): RunRecord | undefined {
  return runs.get(id)?.record;
}

export function emit(id: string, event: AgentEvent): void {
  const entry = runs.get(id);
  if (!entry) return;

  entry.record.events.push(event);

  // Keep derived record fields in sync with terminal-state events.
  switch (event.type) {
    case "status":
      entry.record.status = event.status;
      if (event.bootMs != null) entry.record.bootMs = event.bootMs;
      if (event.sandboxId) entry.record.sandboxId = event.sandboxId;
      break;
    case "preview":
      entry.record.liveUrl = event.url;
      break;
    case "done":
      entry.record.status = "done";
      entry.record.summary = event.summary;
      break;
    case "error":
      entry.record.status = "error";
      entry.record.error = event.message;
      break;
  }

  for (const sub of entry.subscribers) {
    try {
      sub(event);
    } catch {
      // ignore broken subscribers
    }
  }
}

export function setStatus(id: string, status: RunStatus): void {
  const entry = runs.get(id);
  if (entry) entry.record.status = status;
}

export function subscribe(id: string, sub: Subscriber): () => void {
  const entry = runs.get(id);
  if (!entry) return () => {};
  entry.subscribers.add(sub);
  return () => {
    entry.subscribers.delete(sub);
  };
}

export function isTerminal(id: string): boolean {
  const status = runs.get(id)?.record.status;
  return status === "done" || status === "error";
}
