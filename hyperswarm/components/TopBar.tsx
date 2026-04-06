"use client";

import { BrandLogo } from "@/components/BrandLogo";
import type { SwarmPhase } from "@/hooks/useSwarm";

type Props = {
  goal: string;
  activeCount: number;
  totalAgents: number;
  resultsCount: number;
  swarmPhase: SwarmPhase;
  onStop: () => void;
  onNewSwarm: () => void;
};

function statusLabel(phase: SwarmPhase): string {
  switch (phase) {
    case "decomposing":
      return "Decomposing";
    case "executing":
      return "Executing";
    case "synthesizing":
      return "Synthesizing";
    case "complete":
      return "Complete";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

export function TopBar({
  goal,
  activeCount,
  totalAgents,
  resultsCount,
  swarmPhase,
  onStop,
  onNewSwarm,
}: Props) {
  const canStop =
    swarmPhase === "decomposing" ||
    swarmPhase === "executing" ||
    swarmPhase === "synthesizing";
  const canNew = swarmPhase === "complete" || swarmPhase === "error";
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-7 w-auto text-zinc-950" decorative />
          <span className="font-sans text-sm font-normal tracking-tight text-zinc-950">
            HYPERSWARM
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-sans text-xs text-zinc-600">
          <span>
            {activeCount}/{totalAgents || "—"} agents active
          </span>
          <span className="text-zinc-300">|</span>
          <span>{resultsCount} results found</span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-950">{statusLabel(swarmPhase)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canNew ? (
            <button
              type="button"
              onClick={onNewSwarm}
              className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 font-sans text-xs text-zinc-950 transition hover:bg-zinc-200"
            >
              New swarm
            </button>
          ) : null}
          <button
            type="button"
            onClick={onStop}
            disabled={!canStop}
            className="rounded-md border border-zinc-300 px-3 py-2 font-sans text-xs text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Stop swarm
          </button>
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-[1800px] truncate px-0 font-sans text-sm text-zinc-600 md:px-8">
        <span className="text-zinc-500">Goal: </span>
        <span className="text-zinc-950">&quot;{goal}&quot;</span>
      </p>
    </header>
  );
}
