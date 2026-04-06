"use client";

import type { SubTask, SwarmEvent, SwarmSynthesis, RankedResult } from "@/lib/types";
import { parseSwarmSseBuffer } from "@/hooks/useSSE";
import type { BrowserUseLlm } from "@hyperbrowser/sdk/types";
import { useCallback, useRef, useState } from "react";

export type AgentPhase = "pending" | "active" | "extracting" | "complete" | "failed";

export type AgentUiState = {
  index: number;
  siteName: string;
  liveUrl: string;
  jobId: string;
  statusText: string;
  progress: number;
  phase: AgentPhase;
  /** Last step screenshot (data URL or image URL) once the run ends */
  finalFrameSrc?: string;
  /** Last page the agent had open */
  lastPageUrl?: string;
};

export type SwarmPhase =
  | "idle"
  | "decomposing"
  | "executing"
  | "synthesizing"
  | "complete"
  | "error";

const DEFAULT_LLM: BrowserUseLlm = "gpt-5-mini";

function classifyStatus(status: string): "active" | "extracting" {
  const s = status.toLowerCase();
  if (s.includes("extract") || s.includes("parse") || s.includes("scrape"))
    return "extracting";
  return "active";
}

export function useSwarm() {
  const [swarmPhase, setSwarmPhase] = useState<SwarmPhase>("idle");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentUiState[]>([]);
  const [rankedResults, setRankedResults] = useState<RankedResult[]>([]);
  const [synthesis, setSynthesis] = useState<SwarmSynthesis | null>(null);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);

  const [maxAgents, setMaxAgents] = useState(10);
  const [maxSteps, setMaxSteps] = useState(25);
  const [timeoutSeconds, setTimeoutSeconds] = useState(180);
  const [useStealth, setUseStealth] = useState(true);
  const [useProxy, setUseProxy] = useState(true);
  const [solveCaptchas, setSolveCaptchas] = useState(true);
  const [agentLlm, setAgentLlm] = useState<BrowserUseLlm>(DEFAULT_LLM);

  const abortRef = useRef<AbortController | null>(null);
  const jobIdsRef = useRef<string[]>([]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    jobIdsRef.current = [];
    setSwarmPhase("idle");
    setError(null);
    setAgents([]);
    setRankedResults([]);
    setSynthesis(null);
    setDuplicatesRemoved(0);
  }, []);

  const stopSwarm = useCallback(async () => {
    abortRef.current?.abort();
    const ids = [...jobIdsRef.current];
    if (ids.length > 0) {
      try {
        await fetch("/api/stop-swarm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobIds: ids }),
        });
      } catch {
        /* ignore */
      }
    }
    jobIdsRef.current = [];
    setSwarmPhase((p) => (p === "complete" ? p : "error"));
    setError("Stopped");
  }, []);

  const applyEvent = useCallback((ev: SwarmEvent) => {
    switch (ev.type) {
      case "subtasks_ready": {
        setAgents(
          ev.subtasks.map((st, i) => ({
            index: i,
            siteName: st.siteName,
            liveUrl: "",
            jobId: "",
            statusText: "Queued",
            progress: 0,
            phase: "pending" as AgentPhase,
            finalFrameSrc: undefined,
            lastPageUrl: undefined,
          })),
        );
        break;
      }
      case "agent_launched": {
        jobIdsRef.current.push(ev.jobId);
        setAgents((prev) =>
          prev.map((a) =>
            a.index === ev.index
              ? {
                  ...a,
                  liveUrl: ev.liveUrl,
                  jobId: ev.jobId,
                  phase: "active",
                  statusText: "Running",
                  progress: 8,
                }
              : a,
          ),
        );
        break;
      }
      case "agent_live_refresh": {
        setAgents((prev) =>
          prev.map((a) =>
            a.index === ev.index
              ? {
                  ...a,
                  liveUrl: ev.liveUrl.trim() ? ev.liveUrl : a.liveUrl,
                }
              : a,
          ),
        );
        break;
      }
      case "agent_final_frame": {
        setAgents((prev) =>
          prev.map((a) => {
            if (a.index !== ev.index) return a;
            const next = { ...a };
            if (ev.frameSrc?.trim()) next.finalFrameSrc = ev.frameSrc.trim();
            if (ev.lastPageUrl?.trim()) next.lastPageUrl = ev.lastPageUrl.trim();
            return next;
          }),
        );
        break;
      }
      case "agent_progress": {
        const sub = classifyStatus(ev.status);
        setAgents((prev) =>
          prev.map((a) =>
            a.index === ev.index
              ? {
                  ...a,
                  statusText: ev.status,
                  progress: ev.progress,
                  phase:
                    a.phase === "complete" || a.phase === "failed"
                      ? a.phase
                      : sub === "extracting"
                        ? "extracting"
                        : "active",
                }
              : a,
          ),
        );
        break;
      }
      case "agent_complete": {
        setAgents((prev) =>
          prev.map((a) =>
            a.index === ev.index
              ? {
                  ...a,
                  phase: a.phase === "failed" ? "failed" : "complete",
                  progress: 100,
                  statusText:
                    a.phase === "failed" ? a.statusText : "Done",
                }
              : a,
          ),
        );
        break;
      }
      case "agent_failed": {
        setAgents((prev) =>
          prev.map((a) =>
            a.index === ev.index
              ? {
                  ...a,
                  phase: "failed",
                  statusText: ev.error,
                  progress: a.progress,
                }
              : a,
          ),
        );
        break;
      }
      case "result_ranked": {
        setRankedResults(ev.rankedResults);
        setDuplicatesRemoved(ev.duplicatesRemoved);
        break;
      }
      case "synthesizing": {
        setSwarmPhase("synthesizing");
        break;
      }
      case "complete": {
        setSynthesis(ev.synthesis);
        setRankedResults(ev.rankedResults);
        setSwarmPhase("complete");
        break;
      }
      case "error": {
        setError(ev.message);
        setSwarmPhase("error");
        break;
      }
      default:
        break;
    }
  }, []);

  const launchSwarm = useCallback(
    async (inputGoal: string, subtasks: SubTask[], signal: AbortSignal) => {
      setError(null);
      setSynthesis(null);
      setRankedResults([]);
      setDuplicatesRemoved(0);
      setSwarmPhase("executing");
      jobIdsRef.current = [];

      const res = await fetch("/api/launch-swarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: inputGoal,
          subtasks,
          maxAgents,
          maxSteps,
          timeoutSeconds,
          useStealth,
          useProxy,
          solveCaptchas,
          agentLlm,
        }),
        signal,
      });

      if (!res.ok || !res.body) {
        setError("Failed to open swarm stream");
        setSwarmPhase("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const { events, rest } = parseSwarmSseBuffer(buf);
          buf = rest;
          for (const ev of events) {
            applyEvent(ev);
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          return;
        }
        setError(e instanceof Error ? e.message : "Stream error");
        setSwarmPhase("error");
      }
    },
    [
      maxAgents,
      maxSteps,
      timeoutSeconds,
      useStealth,
      useProxy,
      solveCaptchas,
      agentLlm,
      applyEvent,
    ],
  );

  const runDecomposeAndLaunch = useCallback(
    async (inputGoal: string) => {
      const ac = new AbortController();
      abortRef.current = ac;
      jobIdsRef.current = [];
      setGoal(inputGoal);
      setError(null);
      setSwarmPhase("decomposing");

      try {
        const res = await fetch("/api/decompose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: inputGoal, maxAgents }),
          signal: ac.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Decompose failed");
        }
        const subtasks = data.subtasks as SubTask[];
        if (!Array.isArray(subtasks) || subtasks.length === 0) {
          throw new Error("No sub-tasks returned");
        }
        await launchSwarm(inputGoal, subtasks, ac.signal);
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          return;
        }
        setError(e instanceof Error ? e.message : "Failed");
        setSwarmPhase("error");
      }
    },
    [launchSwarm, maxAgents],
  );

  const activeCount = agents.filter(
    (a) => a.phase === "active" || a.phase === "extracting",
  ).length;

  return {
    swarmPhase,
    goal,
    error,
    agents,
    rankedResults,
    synthesis,
    duplicatesRemoved,
    activeCount,
    maxAgents,
    setMaxAgents,
    maxSteps,
    setMaxSteps,
    timeoutSeconds,
    setTimeoutSeconds,
    useStealth,
    setUseStealth,
    useProxy,
    setUseProxy,
    solveCaptchas,
    setSolveCaptchas,
    agentLlm,
    setAgentLlm,
    reset,
    stopSwarm,
    runDecomposeAndLaunch,
  };
}
