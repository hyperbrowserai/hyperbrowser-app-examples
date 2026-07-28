import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "./config";
import type { MemoryGraphData, MemoryGraphEntry } from "./types";

/**
 * Per-site navigation memory. One JSON file per domain under `.memory/` — no
 * database. Everything here is derived from runs that actually happened, so
 * the UI can quote it without inventing numbers.
 */
export const MEMORY_VERSION = 2;

export interface SelectorMemory {
  selector: string;
  /** What it resolved to when last confirmed (visible text / role / tag). */
  resolvedTo: string;
  /** What the browser agent used it for. */
  purpose: string;
  /** Page where the agent last confirmed it. */
  pageUrl: string;
  lastSucceededAt: number;
  /** Runs that confirmed this selector. */
  runs: number;
  /** Runs that reused it from memory (drives pruning). */
  reused: number;
}

export interface NavPathMemory {
  goal: string;
  /** URL sequence that reached the goal. */
  urls: string[];
  /** Query params / filters the model inferred, e.g. "?since=daily". */
  params: string;
  lastSucceededAt: number;
  runs: number;
  reused: number;
}

export interface FlowMemory {
  name: string;
  /** Ordered, portable actions such as "open search" or "submit query". */
  steps: string[];
  lastSucceededAt: number;
  runs: number;
  reused: number;
}

export interface StructureNote {
  note: string;
  pageUrl: string;
  at: number;
  runs: number;
  reused: number;
}

/** The highest-value entries: a real error and the fix that resolved it. */
export interface RepairMemory {
  error: string;
  failedApproach: string;
  fix: string;
  at: number;
  runs: number;
  reused: number;
}

export type EnvFactKind =
  | "stealth_required"
  | "captcha"
  | "proxy_blocked"
  | "login_required"
  | "other";

export interface EnvFact {
  kind: EnvFactKind;
  detail: string;
  at: number;
  runs: number;
  reused: number;
}

/** One recorded run, used for the measured first-vs-repeat comparison. */
export interface RunRecord {
  at: number;
  task: string;
  ok: boolean;
  steps: number;
  elapsedMs: number;
  inputTokens: number;
  outputTokens: number;
  repaired: boolean;
  /** Whether domain memory was injected into the agent's context. */
  memoryUsed: boolean;
  selectorsReused: number;
}

export interface DomainMemory {
  version: number;
  domain: string;
  createdAt: number;
  updatedAt: number;
  selectors: SelectorMemory[];
  navPaths: NavPathMemory[];
  flows: FlowMemory[];
  structureNotes: StructureNote[];
  repairs: RepairMemory[];
  envFacts: EnvFact[];
  runHistory: RunRecord[];
}

export interface MemoryStats {
  priorRuns: number;
  selectors: number;
  navPaths: number;
  flows: number;
  repairs: number;
  notes: number;
  envFacts: number;
}

/** Reduce a URL to the memory key: lowercase host without a leading "www.". */
export function domainKeyOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

function fileNameFor(domain: string): string | null {
  const safe = domain.toLowerCase().replace(/[^a-z0-9.-]/g, "_").replace(/^\.+/, "");
  if (!safe || safe.includes("..")) return null;
  return `${safe}.json`;
}

function memoryDir(): string {
  return path.join(process.cwd(), ".memory");
}

export function memoryPathFor(domain: string): string | null {
  const name = fileNameFor(domain);
  return name ? path.join(memoryDir(), name) : null;
}

export function emptyMemory(domain: string): DomainMemory {
  const now = Date.now();
  return {
    version: MEMORY_VERSION,
    domain,
    createdAt: now,
    updatedAt: now,
    selectors: [],
    navPaths: [],
    flows: [],
    structureNotes: [],
    repairs: [],
    envFacts: [],
    runHistory: [],
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Load a domain's memory. A missing, unreadable, corrupt, or wrong-version file
 * yields null — memory is an optimisation and must never break a run.
 */
export async function loadMemory(domain: string): Promise<DomainMemory | null> {
  const file = memoryPathFor(domain);
  if (!file) return null;
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<DomainMemory>;
    if (parsed.version !== 1 && parsed.version !== MEMORY_VERSION) return null;
    return {
      version: MEMORY_VERSION,
      domain: typeof parsed.domain === "string" ? parsed.domain : domain,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      selectors: asArray<SelectorMemory>(parsed.selectors),
      navPaths: asArray<NavPathMemory>(parsed.navPaths),
      flows: asArray<FlowMemory>(parsed.flows),
      structureNotes: asArray<StructureNote>(parsed.structureNotes),
      repairs: asArray<RepairMemory>(parsed.repairs),
      envFacts: asArray<EnvFact>(parsed.envFacts),
      runHistory: asArray<RunRecord>(parsed.runHistory),
    };
  } catch {
    return null;
  }
}

export function statsOf(memory: DomainMemory): MemoryStats {
  return {
    priorRuns: memory.runHistory.length,
    selectors: memory.selectors.length,
    navPaths: memory.navPaths.length,
    flows: memory.flows.length,
    repairs: memory.repairs.length,
    notes: memory.structureNotes.length,
    envFacts: memory.envFacts.length,
  };
}

/** Build a compact, client-safe graph projection of the stored memory. */
export function graphDataOf(memory: DomainMemory): MemoryGraphData {
  const entries: MemoryGraphEntry[] = [
    ...memory.selectors.map((entry, index) => ({
      id: `selector-${index}-${entry.selector}`,
      kind: "selector" as const,
      label: entry.selector,
      detail: entry.purpose || entry.resolvedTo || "Working selector",
      reused: entry.reused,
    })),
    ...memory.navPaths.map((entry, index) => ({
      id: `navigation-${index}-${entry.goal}`,
      kind: "navigation" as const,
      label: entry.goal,
      detail: entry.urls.join(" → "),
      reused: entry.reused,
    })),
    ...memory.flows.map((entry, index) => ({
      id: `flow-${index}-${entry.name}`,
      kind: "flow" as const,
      label: entry.name,
      detail: entry.steps.join(" → "),
      reused: entry.reused,
    })),
    ...memory.repairs.map((entry, index) => ({
      id: `repair-${index}-${entry.error}`,
      kind: "repair" as const,
      label: entry.error,
      detail: entry.fix,
      reused: entry.reused,
    })),
    ...memory.structureNotes.map((entry, index) => ({
      id: `structure-${index}-${entry.note}`,
      kind: "structure" as const,
      label: entry.note,
      detail: entry.pageUrl,
      reused: entry.reused,
    })),
    ...memory.envFacts.map((entry, index) => ({
      id: `environment-${index}-${entry.kind}`,
      kind: "environment" as const,
      label: entry.kind.replaceAll("_", " "),
      detail: entry.detail,
      reused: entry.reused,
    })),
  ];
  return { entries };
}

function trim(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

// ── Merges: same key bumps the counter and timestamp instead of duplicating ──

export function rememberSelector(
  memory: DomainMemory,
  entry: { selector: string; resolvedTo?: string; purpose?: string; pageUrl: string },
  at: number
): void {
  const selector = trim(entry.selector, 400);
  if (!selector) return;
  const existing = memory.selectors.find((s) => s.selector === selector);
  if (existing) {
    existing.runs += 1;
    existing.lastSucceededAt = at;
    existing.pageUrl = entry.pageUrl || existing.pageUrl;
    if (entry.resolvedTo) existing.resolvedTo = trim(entry.resolvedTo, 160);
    if (entry.purpose) existing.purpose = trim(entry.purpose, 160);
    return;
  }
  memory.selectors.push({
    selector,
    resolvedTo: trim(entry.resolvedTo, 160),
    purpose: trim(entry.purpose, 160),
    pageUrl: entry.pageUrl,
    lastSucceededAt: at,
    runs: 1,
    reused: 0,
  });
}

export function rememberNavPath(
  memory: DomainMemory,
  entry: { goal: string; urls: string[]; params?: string },
  at: number
): void {
  const goal = trim(entry.goal, 200);
  const urls = (Array.isArray(entry.urls) ? entry.urls : [])
    .map((u) => trim(u, 500))
    .filter(Boolean)
    .slice(0, 8);
  if (!goal || !urls.length) return;
  const key = urls.join(" > ");
  const existing = memory.navPaths.find((p) => p.urls.join(" > ") === key);
  if (existing) {
    existing.runs += 1;
    existing.lastSucceededAt = at;
    if (entry.params) existing.params = trim(entry.params, 200);
    return;
  }
  memory.navPaths.push({
    goal,
    urls,
    params: trim(entry.params, 200),
    lastSucceededAt: at,
    runs: 1,
    reused: 0,
  });
}

export function rememberFlow(
  memory: DomainMemory,
  entry: { name: string; steps: string[] },
  at: number
): void {
  const name = trim(entry.name, 200);
  const steps = (Array.isArray(entry.steps) ? entry.steps : [])
    .map((step) => trim(step, 300))
    .filter(Boolean)
    .slice(0, 20);
  if (!name || !steps.length) return;
  const existing = memory.flows.find(
    (flow) => flow.name === name || flow.steps.join(" > ") === steps.join(" > ")
  );
  if (existing) {
    existing.runs += 1;
    existing.lastSucceededAt = at;
    existing.name = name;
    existing.steps = steps;
    return;
  }
  memory.flows.push({ name, steps, lastSucceededAt: at, runs: 1, reused: 0 });
}

export function rememberNote(
  memory: DomainMemory,
  entry: { note: string; pageUrl: string },
  at: number
): void {
  const note = trim(entry.note, 600);
  if (!note) return;
  const existing = memory.structureNotes.find((n) => n.note === note);
  if (existing) {
    existing.runs += 1;
    existing.at = at;
    return;
  }
  memory.structureNotes.push({ note, pageUrl: entry.pageUrl, at, runs: 1, reused: 0 });
}

export function rememberRepair(
  memory: DomainMemory,
  entry: { error: string; failedApproach: string; fix: string },
  at: number
): void {
  const error = trim(entry.error, 400);
  const fix = trim(entry.fix, 600);
  if (!error || !fix) return;
  const existing = memory.repairs.find((r) => r.error === error && r.fix === fix);
  if (existing) {
    existing.runs += 1;
    existing.at = at;
    return;
  }
  memory.repairs.push({
    error,
    failedApproach: trim(entry.failedApproach, 400),
    fix,
    at,
    runs: 1,
    reused: 0,
  });
}

export function rememberEnvFact(
  memory: DomainMemory,
  entry: { kind: EnvFactKind; detail: string },
  at: number
): void {
  const detail = trim(entry.detail, 300);
  const kind = entry.kind;
  if (!kind) return;
  const existing = memory.envFacts.find((f) => f.kind === kind && f.detail === detail);
  if (existing) {
    existing.runs += 1;
    existing.at = at;
    return;
  }
  memory.envFacts.push({ kind, detail, at, runs: 1, reused: 0 });
}

/** Credit entries the current run actually pulled from memory. */
export function markSelectorsReused(memory: DomainMemory, selectors: string[]): void {
  const wanted = new Set(selectors);
  for (const entry of memory.selectors) {
    if (wanted.has(entry.selector)) entry.reused += 1;
  }
}

export function markRepairsReused(memory: DomainMemory, repairs: RepairMemory[]): void {
  const wanted = new Set(repairs.map((r) => `${r.error}|${r.fix}`));
  for (const entry of memory.repairs) {
    if (wanted.has(`${entry.error}|${entry.fix}`)) entry.reused += 1;
  }
}

export function markNavPathsReused(memory: DomainMemory, goals: string[]): void {
  const wanted = new Set(goals);
  for (const entry of memory.navPaths) {
    if (wanted.has(entry.goal)) entry.reused += 1;
  }
}

export function markFlowsReused(memory: DomainMemory, names: string[]): void {
  const wanted = new Set(names);
  for (const entry of memory.flows) {
    if (wanted.has(entry.name)) entry.reused += 1;
  }
}

export function recordRun(memory: DomainMemory, record: RunRecord): void {
  memory.runHistory.push(record);
}

// ── Pruning ─────────────────────────────────────────────────────────────────

/** Oldest-first, and never-reused before ever-reused. */
function pruneOrder<T extends { reused: number }>(items: T[], stamp: (item: T) => number): T[] {
  return [...items].sort((a, b) => {
    if ((a.reused === 0) !== (b.reused === 0)) return a.reused === 0 ? -1 : 1;
    return stamp(a) - stamp(b);
  });
}

function dropOldestUnreused<T extends { reused: number }>(
  items: T[],
  stamp: (item: T) => number,
  keep: number
): { kept: T[]; dropped: number } {
  if (items.length <= keep) return { kept: items, dropped: 0 };
  const ordered = pruneOrder(items, stamp);
  const doomed = new Set(ordered.slice(0, items.length - keep));
  return { kept: items.filter((item) => !doomed.has(item)), dropped: doomed.size };
}

function sizeOf(memory: DomainMemory): number {
  return Buffer.byteLength(JSON.stringify(memory), "utf8");
}

/**
 * Enforce the per-category caps, then the byte cap. Repairs are the last thing
 * we ever touch — a discovered fix is the most valuable entry in the file.
 */
export function pruneMemory(memory: DomainMemory): number {
  let dropped = 0;

  const selectors = dropOldestUnreused(
    memory.selectors,
    (s) => s.lastSucceededAt,
    CONFIG.memoryMaxSelectors
  );
  memory.selectors = selectors.kept;
  dropped += selectors.dropped;

  const navPaths = dropOldestUnreused(
    memory.navPaths,
    (p) => p.lastSucceededAt,
    CONFIG.memoryMaxNavPaths
  );
  memory.navPaths = navPaths.kept;
  dropped += navPaths.dropped;

  const flows = dropOldestUnreused(
    memory.flows,
    (flow) => flow.lastSucceededAt,
    CONFIG.memoryMaxFlows
  );
  memory.flows = flows.kept;
  dropped += flows.dropped;

  const notes = dropOldestUnreused(memory.structureNotes, (n) => n.at, CONFIG.memoryMaxNotes);
  memory.structureNotes = notes.kept;
  dropped += notes.dropped;

  const envFacts = dropOldestUnreused(memory.envFacts, (f) => f.at, CONFIG.memoryMaxEnvFacts);
  memory.envFacts = envFacts.kept;
  dropped += envFacts.dropped;

  // Run history: the first recorded run is pinned so the comparison survives.
  if (memory.runHistory.length > CONFIG.memoryMaxRunHistory) {
    const [first, ...rest] = memory.runHistory;
    const keepRest = CONFIG.memoryMaxRunHistory - 1;
    memory.runHistory = [first, ...rest.slice(rest.length - keepRest)];
  }

  // Byte cap: shed least-reused entries. Repairs are never evicted.
  const order: Array<() => boolean> = [
    () => shed(memory.structureNotes, (n) => n.at),
    () => shed(memory.selectors, (s) => s.lastSucceededAt),
    () => shed(memory.navPaths, (p) => p.lastSucceededAt),
    () => shed(memory.flows, (flow) => flow.lastSucceededAt),
    () => shed(memory.envFacts, (f) => f.at),
  ];
  while (sizeOf(memory) > CONFIG.memoryMaxBytes) {
    const shedOne = order.some((attempt) => attempt());
    if (!shedOne) break;
    dropped += 1;
  }

  return dropped;
}

function shed<T extends { reused: number }>(items: T[], stamp: (item: T) => number): boolean {
  if (!items.length) return false;
  const ordered = pruneOrder(items, stamp);
  const victim = ordered[0];
  const index = items.indexOf(victim);
  if (index === -1) return false;
  items.splice(index, 1);
  return true;
}

// ── Persistence ─────────────────────────────────────────────────────────────

export interface SaveOutcome {
  bytes: number;
  pruned: number;
  path: string;
}

/** Prune, then write atomically (temp file + rename) so a crash can't corrupt. */
export async function saveMemory(memory: DomainMemory): Promise<SaveOutcome | null> {
  const file = memoryPathFor(memory.domain);
  if (!file) return null;
  const pruned = pruneMemory(memory);
  memory.updatedAt = Date.now();
  const body = JSON.stringify(memory, null, 2);
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, body, "utf8");
  await rename(temp, file);
  return { bytes: Buffer.byteLength(body, "utf8"), pruned, path: file };
}

export function firstRecordedRun(memory: DomainMemory): RunRecord | null {
  return memory.runHistory[0] ?? null;
}
