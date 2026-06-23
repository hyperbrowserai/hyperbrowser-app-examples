// The brain. Primary backend is a Hyperbrowser persistent volume mounted into one
// long-lived sandbox, reused across every request (a warm mount makes recall a fast
// file read, not a fresh spin-up).
//
// If the API key lacks the `sandbox_volumes` feature flag, mounting fails. Rather than
// break, we fall back to a durable local-disk brain so the product still runs and the
// demo (learn vs recall, persistence across reloads) works. The moment the flag is
// enabled, the volume path is used automatically — no code change.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  client,
  createSandbox,
  getVolumeId,
  MOUNT_PATH,
  type SandboxHandle,
} from "./hyperbrowser";
import type { BrainSummary, Memory } from "./types";

export type BrainMode = "volume" | "local";

interface Backend {
  mode: BrainMode;
  has: (domain: string) => Promise<boolean>;
  read: (domain: string) => Promise<string>;
  write: (domain: string, contents: string) => Promise<void>;
  listFiles: () => Promise<string[]>; // domains (without .json)
}

const LOCAL_DIR = join(process.cwd(), ".brain");

function isFeatureFlagError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /sandbox_volumes|feature flag/i.test(msg);
}

function localBackend(): Backend {
  const path = (domain: string) => join(LOCAL_DIR, `${domain}.json`);
  return {
    mode: "local",
    has: async (domain) => existsSync(path(domain)),
    read: (domain) => readFile(path(domain), "utf8"),
    write: async (domain, contents) => {
      await mkdir(LOCAL_DIR, { recursive: true });
      await writeFile(path(domain), contents, "utf8");
    },
    listFiles: async () => {
      if (!existsSync(LOCAL_DIR)) return [];
      const files = await readdir(LOCAL_DIR);
      return files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
    },
  };
}

function volumeBackend(sandbox: SandboxHandle): Backend {
  const path = (domain: string) => `${MOUNT_PATH}/${domain}.json`;
  return {
    mode: "volume",
    has: (domain) => sandbox.files.exists(path(domain)),
    read: (domain) => sandbox.files.readText(path(domain)),
    write: async (domain, contents) => {
      await sandbox.files.writeText(path(domain), contents);
    },
    listFiles: async () => {
      let entries;
      try {
        entries = await sandbox.files.list(MOUNT_PATH, { depth: 1 });
      } catch {
        return [];
      }
      return entries
        .filter((e) => e.type === "file" && e.name.endsWith(".json"))
        .map((e) => e.name.slice(0, -5));
    },
  };
}

// Cache the backend on globalThis so it survives Next.js dev hot-reloads in a process.
const g = globalThis as typeof globalThis & { __brain?: Promise<Backend> };

function backend(): Promise<Backend> {
  if (!g.__brain) {
    g.__brain = (async () => {
      try {
        const hb = client();
        const volumeId = await getVolumeId(hb);
        const sandbox = await createSandbox(hb, volumeId);
        return volumeBackend(sandbox);
      } catch (err) {
        if (isFeatureFlagError(err)) {
          console.warn(
            "[BrowserBrain] sandbox_volumes flag not enabled; using durable local-disk brain. Enable the flag to switch to the persistent volume automatically.",
          );
          return localBackend();
        }
        throw err;
      }
    })();
  }
  return g.__brain;
}

export async function brainMode(): Promise<BrainMode> {
  return (await backend()).mode;
}

export function normalize(input: string): { url: string; domain: string } {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);
  const domain = parsed.hostname.replace(/^www\./, "");
  return { url: withScheme, domain };
}

export async function hasMemory(domain: string): Promise<boolean> {
  return (await backend()).has(domain);
}

export async function readMemory(domain: string): Promise<Memory> {
  const b = await backend();
  return JSON.parse(await b.read(domain)) as Memory;
}

export async function writeMemory(domain: string, memory: Memory): Promise<void> {
  const b = await backend();
  await b.write(domain, JSON.stringify(memory, null, 2));
}

// Every domain the brain knows — survives reloads (volume) or reloads+restarts (local).
export async function listMemories(): Promise<BrainSummary[]> {
  const b = await backend();
  const domains = await b.listFiles();
  const raw = await Promise.all(
    domains.map(async (d) => {
      try {
        return JSON.parse(await b.read(d)) as Memory;
      } catch {
        return null;
      }
    }),
  );

  const summaries: BrainSummary[] = [];
  for (const m of raw) {
    if (!m) continue;
    summaries.push({
      domain: m.domain,
      url: m.url,
      pageType: m.pageType,
      learnedAt: m.learnedAt,
      learnMs: m.learnMs,
    });
  }
  return summaries.sort((a, b) => +new Date(b.learnedAt) - +new Date(a.learnedAt));
}
