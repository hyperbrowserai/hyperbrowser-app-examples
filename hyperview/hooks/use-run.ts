"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentEvent, RunStatus } from "@/lib/types";

export interface SandboxFile {
  path: string;
  contents: string;
}

export interface BrowserCapture {
  url: string;
  instruction: string;
  text: string;
  screenshot?: string;
}

export interface RunState {
  runId: string | null;
  task: string;
  status: RunStatus | "idle";
  bootMs: number | null;
  image: string | null;
  sandboxId: string | null;
  terminal: string;
  files: SandboxFile[];
  browser: BrowserCapture[];
  previewUrl: string | null;
  previewPort: number | null;
  thinking: string | null;
  summary: string | null;
  error: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

const initial: RunState = {
  runId: null,
  task: "",
  status: "idle",
  bootMs: null,
  image: null,
  sandboxId: null,
  terminal: "",
  files: [],
  browser: [],
  previewUrl: null,
  previewPort: null,
  thinking: null,
  summary: null,
  error: null,
  startedAt: null,
  finishedAt: null,
};

export function useRun() {
  const [state, setState] = useState<RunState>(initial);
  const esRef = useRef<EventSource | null>(null);

  const apply = useCallback((event: AgentEvent) => {
    setState((prev) => {
      switch (event.type) {
        case "status":
          return {
            ...prev,
            status: event.status,
            bootMs: event.bootMs ?? prev.bootMs,
            image: event.image ?? prev.image,
            sandboxId: event.sandboxId ?? prev.sandboxId,
          };
        case "terminal":
          return { ...prev, terminal: prev.terminal + event.data };
        case "file": {
          const existing = prev.files.findIndex((f) => f.path === event.path);
          const files = [...prev.files];
          if (existing >= 0) files[existing] = { path: event.path, contents: event.contents };
          else files.push({ path: event.path, contents: event.contents });
          return { ...prev, files };
        }
        case "browser":
          return {
            ...prev,
            browser: [
              ...prev.browser,
              {
                url: event.url,
                instruction: event.instruction,
                text: event.text,
                screenshot: event.screenshot,
              },
            ],
          };
        case "preview":
          return { ...prev, previewUrl: event.url, previewPort: event.port };
        case "thinking":
          return { ...prev, thinking: event.text };
        case "done":
          return {
            ...prev,
            status: "done",
            summary: event.summary,
            finishedAt: Date.now(),
          };
        case "error":
          return {
            ...prev,
            status: "error",
            error: event.message,
            finishedAt: Date.now(),
          };
        default:
          return prev;
      }
    });
  }, []);

  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setState(initial);
  }, []);

  const run = useCallback(
    async (task: string) => {
      esRef.current?.close();
      setState({ ...initial, task, status: "booting", startedAt: Date.now() });

      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${res.status})`);
        }
        const { runId } = (await res.json()) as { runId: string };
        setState((prev) => ({ ...prev, runId }));

        const es = new EventSource(`/api/run/${runId}/stream`);
        esRef.current = es;

        es.onmessage = (e) => {
          try {
            apply(JSON.parse(e.data) as AgentEvent);
          } catch {
            /* ignore malformed */
          }
        };
        es.addEventListener("end", () => {
          es.close();
          esRef.current = null;
        });
        es.onerror = () => {
          // EventSource auto-retries; if the run already ended this is harmless.
          setState((prev) => {
            if (prev.status === "done" || prev.status === "error") {
              es.close();
              return prev;
            }
            return prev;
          });
        };
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Failed to start run",
        }));
      }
    },
    [apply]
  );

  return { state, run, reset };
}
