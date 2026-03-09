"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Run } from "@/types";

interface StreamEvent {
  event: string;
  [key: string]: unknown;
}

const TERMINAL_STATUSES = ["completed", "failed"];

export function useRunStream(runId: string | null) {
  const [streamingTokens, setStreamingTokens] = useState("");
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Fetch the full run state from the REST API
  const fetchRun = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) return;
      const data: Run = await res.json();
      setRun(data);
      return data;
    } catch {
      return null;
    }
  }, [runId]);

  useEffect(() => {
    if (!runId) {
      setRun(null);
      setStreamingTokens("");
      setEvents([]);
      cleanup();
      return;
    }

    setIsLoading(true);
    setStreamingTokens("");
    setEvents([]);

    // Initial fetch
    fetchRun().then((data) => {
      setIsLoading(false);
      if (!data || TERMINAL_STATUSES.includes(data.status)) {
        // Already done, just poll once and stop
        return;
      }

      // Open SSE stream
      try {
        const es = new EventSource(`/api/runs/${runId}/stream`);
        esRef.current = es;
        setIsStreaming(true);

        es.addEventListener("step", (e) => {
          try {
            const data = JSON.parse(e.data);
            setEvents((prev) => [...prev, data]);
            // Refresh full run on step changes
            fetchRun();
          } catch { /* skip */ }
        });

        es.addEventListener("subagent", (e) => {
          try {
            const data = JSON.parse(e.data);
            setEvents((prev) => [...prev, data]);
            fetchRun();
          } catch { /* skip */ }
        });

        es.addEventListener("token", (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.text) {
              setStreamingTokens((prev) => prev + data.text);
            }
          } catch { /* skip */ }
        });

        es.addEventListener("done", () => {
          cleanup();
          fetchRun();
        });

        es.onerror = () => {
          // Fall back to polling on SSE error
          cleanup();
          intervalRef.current = setInterval(async () => {
            const data = await fetchRun();
            if (data && TERMINAL_STATUSES.includes(data.status)) {
              if (intervalRef.current) clearInterval(intervalRef.current);
            }
          }, 2000);
        };
      } catch {
        // EventSource not supported, fall back to polling
        intervalRef.current = setInterval(async () => {
          const data = await fetchRun();
          if (data && TERMINAL_STATUSES.includes(data.status)) {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }, 2000);
      }
    });

    return cleanup;
  }, [runId, fetchRun, cleanup]);

  return { run, streamingTokens, events, isStreaming, isLoading };
}
