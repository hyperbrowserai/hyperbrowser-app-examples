"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Run } from "@/types";

const TERMINAL_STATUSES = ["completed", "failed"];

export function usePollRun(runId: string | null) {
  const [run, setRun] = useState<Run | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortedRef = useRef(false);

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    abortedRef.current = false;

    if (!runId) {
      setRun(null);
      clearPolling();
      return;
    }

    async function fetchRun() {
      if (abortedRef.current || !runId) return;
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok || abortedRef.current) return;
        const data: Run = await res.json();
        if (abortedRef.current) return;
        setRun(data);

        if (TERMINAL_STATUSES.includes(data.status)) {
          clearPolling();
        }
      } catch {
        // silently retry on next interval
      }
    }

    setIsLoading(true);
    fetchRun().finally(() => setIsLoading(false));

    intervalRef.current = setInterval(fetchRun, 2000);

    return () => {
      abortedRef.current = true;
      clearPolling();
    };
  }, [runId, clearPolling]);

  return { run, isLoading };
}
