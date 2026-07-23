"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Wordmark } from "./wordmark";
import { Ticker } from "./ticker";
import type { RunState } from "@/lib/use-swarm";
import type { Phase } from "@/lib/types";

const PHASE_LABEL: Record<Phase, string> = {
  spawning: "Spawning swarm",
  scraping: "Swarm reading",
  synthesizing: "Assembling context",
  answering: "K3 answering",
  done: "Complete",
  error: "Error",
};

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/** Live browsers = in-flight scrape jobs + hero sessions currently streaming.
 * Every one is a real, open Hyperbrowser browser. */
function liveBrowsers(state: RunState): number {
  const scraping = state.tiles.filter((t) => t.status === "active").length;
  const heroes = state.hero.filter((h) => h.status === "live").length;
  return scraping + heroes;
}

export function MissionBar({
  state,
  question,
  onReset,
}: {
  state: RunState;
  question: string;
  onReset: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state.status !== "running" || !state.startedAt) {
      if (state.stats) setElapsed(state.stats.elapsedMs);
      return;
    }
    const started = state.startedAt;
    const tick = () => setElapsed(Date.now() - started);
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state.status, state.startedAt, state.stats]);

  const running = state.status === "running";
  const live = liveBrowsers(state);
  const phase = state.phase;

  return (
    <div className="sticky top-0 z-20 border-b-4 border-black bg-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Wordmark compact />

        <div className="hidden md:block flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Question
          </p>
          <p className="text-sm font-semibold truncate text-black">{question}</p>
        </div>

        {/* live instrument cluster */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <Stat
            label="browsers live"
            value={<Ticker value={live} className="text-2xl font-bold" />}
            sub={`cap ${state.maxBrowsers}`}
          />
          <Stat
            label="pages"
            value={<Ticker value={state.stats?.pages ?? state.pagesRead} className="text-2xl font-bold" />}
            sub={`of ${state.totalSeeds}`}
          />
          <Stat
            label="elapsed"
            value={<span className="text-2xl font-bold font-mono tnum">{fmt(elapsed)}</span>}
          />

          {phase && (
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border-2 border-black ${
                phase === "error"
                  ? "text-gray-500 border-gray-300"
                  : running
                    ? "bg-[var(--accent)] text-black"
                    : "bg-black text-white"
              }`}
            >
              {running && <Loader2 size={11} strokeWidth={3} className="animate-spin" />}
              {PHASE_LABEL[phase]}
            </span>
          )}

          <button
            type="button"
            onClick={onReset}
            title="New run"
            className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-brutal-sm hover:shadow-brutal hover:-translate-y-0.5"
          >
            <RotateCcw size={14} strokeWidth={2.5} />
            <span className="hidden lg:inline">New</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-end leading-none">
      <div className="text-black">{value}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
          {label}
        </span>
        {sub && <span className="font-mono text-[9px] text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}
