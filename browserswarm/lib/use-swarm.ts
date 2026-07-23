"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { HeroStatus, Phase, SwarmEvent, TileStatus } from "./types";

export interface ClientTile {
  id: number;
  url: string;
  host: string;
  status: TileStatus;
  title?: string;
  error?: string;
}

export interface ClientHero {
  id: number;
  url: string;
  host: string;
  liveUrl: string | null;
  status: HeroStatus;
  title?: string;
  error?: string;
}

export interface DoneStats {
  pages: number;
  sites: number;
  tokens: number;
  answerTokens: number;
  elapsedMs: number;
  capped: boolean;
  costUsd: number;
}

export interface RunState {
  status: "idle" | "running" | "done" | "error";
  phase: Phase | null;
  phaseMsg?: string;
  startedAt: number | null;
  maxBrowsers: number;
  budgetTokens: number;
  hardLimit: number;
  totalSeeds: number;
  tiles: ClientTile[];
  heroIds: Set<number>;
  hero: ClientHero[];
  pagesRead: number;
  tokens: number;
  capped: boolean;
  answer: string;
  stats: DoneStats | null;
  error?: string;
}

const initial: RunState = {
  status: "idle",
  phase: null,
  startedAt: null,
  maxBrowsers: 0,
  budgetTokens: 0,
  hardLimit: 1_000_000,
  totalSeeds: 0,
  tiles: [],
  heroIds: new Set(),
  hero: [],
  pagesRead: 0,
  tokens: 0,
  capped: false,
  answer: "",
  stats: null,
};

type Action =
  | { kind: "reset" }
  | { kind: "begin" }
  | { kind: "event"; event: SwarmEvent };

function reducer(state: RunState, action: Action): RunState {
  switch (action.kind) {
    case "reset":
      return { ...initial, heroIds: new Set() };
    case "begin":
      return { ...initial, heroIds: new Set(), status: "running", startedAt: Date.now() };
    case "event":
      return applyEvent(state, action.event);
  }
}

function applyEvent(state: RunState, e: SwarmEvent): RunState {
  switch (e.t) {
    case "init":
      return {
        ...state,
        maxBrowsers: e.maxBrowsers,
        budgetTokens: e.budgetTokens,
        hardLimit: e.hardLimit,
        totalSeeds: e.totalSeeds,
        tiles: e.tiles.map((t) => ({ ...t, status: "idle" as TileStatus })),
        heroIds: new Set(e.hero.map((h) => h.id)),
        hero: e.hero.map((h) => ({ ...h, status: "spawning" as HeroStatus })),
      };
    case "tile":
      return {
        ...state,
        tiles: state.tiles.map((t) =>
          t.id === e.id
            ? { ...t, status: e.status, title: e.title ?? t.title, error: e.error }
            : t
        ),
      };
    case "hero":
      return {
        ...state,
        hero: state.hero.map((h) =>
          h.id === e.id
            ? {
                ...h,
                status: e.status,
                liveUrl: e.liveUrl !== undefined ? e.liveUrl : h.liveUrl,
                title: e.title ?? h.title,
                error: e.error,
              }
            : h
        ),
      };
    case "ctx":
      return { ...state, pagesRead: e.pagesRead, tokens: e.tokens, capped: e.capped };
    case "phase":
      return { ...state, phase: e.phase, phaseMsg: e.msg };
    case "answer":
      return { ...state, answer: state.answer + e.delta };
    case "done":
      return { ...state, status: "done", phase: "done", stats: { ...e }, capped: e.capped };
    case "error":
      return { ...state, status: "error", phase: "error", error: e.message };
  }
}

export function useSwarm() {
  const [state, dispatch] = useReducer(reducer, initial);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async (question: string, seeds: string[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ kind: "begin" });

    let res: Response;
    try {
      res = await fetch("/api/swarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, seeds }),
        signal: controller.signal,
      });
    } catch (err) {
      if (!controller.signal.aborted)
        dispatch({ kind: "event", event: { t: "error", message: err instanceof Error ? err.message : "Request failed" } });
      return;
    }

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      dispatch({ kind: "event", event: { t: "error", message: (data as { error?: string }).error || "Swarm failed to start" } });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            dispatch({ kind: "event", event: JSON.parse(line) as SwarmEvent });
          } catch {
            /* skip malformed line */
          }
        }
      }
    } catch (err) {
      if (!controller.signal.aborted)
        dispatch({ kind: "event", event: { t: "error", message: err instanceof Error ? err.message : "Stream error" } });
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ kind: "reset" });
  }, []);

  return { state, start, reset };
}
