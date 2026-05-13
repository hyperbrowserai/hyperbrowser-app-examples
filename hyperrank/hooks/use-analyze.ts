"use client";

import { useCallback, useRef, useState } from "react";
import type { EngineKey, Scorecard, SseEvent } from "@/lib/types";

interface AnalyzeState {
  loading: boolean;
  step: 0 | 1 | 2 | 3 | 4 | 5;
  stepLabel: string;
  engineProgress: Record<EngineKey, { completed: number; total: number }>;
  scorecard: Scorecard | null;
  error: string | null;
}

const INITIAL_PROGRESS: AnalyzeState["engineProgress"] = {
  chatgpt: { completed: 0, total: 0 },
  claude: { completed: 0, total: 0 },
  perplexity: { completed: 0, total: 0 },
  google: { completed: 0, total: 0 },
};

const INITIAL_STATE: AnalyzeState = {
  loading: false,
  step: 0,
  stepLabel: "",
  engineProgress: INITIAL_PROGRESS,
  scorecard: null,
  error: null,
};

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const run = useCallback(async (url: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState({
      ...INITIAL_STATE,
      loading: true,
      stepLabel: "Connecting…",
      step: 0,
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: ctrl.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        let message = `Request failed (${response.status})`;
        try {
          const json = JSON.parse(text) as { error?: string };
          if (json.error) message = json.error;
        } catch {
          /* not json */
        }
        setState((s) => ({ ...s, loading: false, error: message }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const event = parseEvent(raw);
          if (event) applyEvent(setState, event);
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "request failed",
      }));
    }
  }, []);

  return { ...state, run, reset };
}

function parseEvent(raw: string): SseEvent | null {
  const lines = raw.split("\n");
  let data = "";
  for (const line of lines) {
    if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }
  if (!data) return null;
  try {
    return JSON.parse(data) as SseEvent;
  } catch {
    return null;
  }
}

function applyEvent(
  setState: React.Dispatch<React.SetStateAction<AnalyzeState>>,
  event: SseEvent
) {
  setState((s) => {
    switch (event.type) {
      case "step":
        return { ...s, step: event.id, stepLabel: event.label };
      case "engine_progress":
        return {
          ...s,
          engineProgress: {
            ...s.engineProgress,
            [event.engine]: {
              completed: event.completed,
              total: event.total,
            },
          },
        };
      case "done":
        return {
          ...s,
          loading: false,
          step: 5,
          stepLabel: "Done",
          scorecard: event.scorecard,
        };
      case "error":
        return {
          ...s,
          loading: false,
          error: event.message,
        };
      default:
        return s;
    }
  });
}
