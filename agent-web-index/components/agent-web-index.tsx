"use client";

import { useMemo, useState } from "react";
import type { Site } from "@/lib/types";
import Hero from "@/components/hero";
import BenchmarkRunner from "@/components/benchmark-runner";
import BrowserWindow from "@/components/browser-window";
import Leaderboard from "@/components/leaderboard";

export default function AgentWebIndex() {
  const [sites, setSites] = useState<Site[]>([]);
  const hasData = sites.length > 0;

  const hardest = useMemo(
    () => (hasData ? [...sites].sort((a, b) => b.difficulty - a.difficulty)[0] : null),
    [hasData, sites]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sites.find((s) => s.id === selectedId) ?? hardest;

  return (
    <main className="min-h-screen bg-[#fafafa] text-black font-sans selection:bg-black selection:text-white">
      <div className="max-w-[1100px] mx-auto px-5 pb-24">
        <Hero sites={sites} />
        <BenchmarkRunner
          onResults={setSites}
          onSelectSite={setSelectedId}
          onClear={() => {
            setSites([]);
            setSelectedId(null);
          }}
        />

        {hasData && selected ? (
          <>
            <div className="flex items-baseline justify-between gap-4 flex-wrap mt-8 mb-4">
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.16em]">
                agent run &mdash; {selected.label}
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-widest text-gray-400">
                recorded run
              </span>
            </div>
            <BrowserWindow site={selected} />

            <Leaderboard
              sites={sites}
              selectedId={selected.id}
              onSelect={setSelectedId}
            />
          </>
        ) : (
          <EmptyState />
        )}

        <footer className="mt-14 pt-6 border-t-4 border-black flex flex-col gap-3.5">
          <span className="font-mono text-xs text-gray-500 lowercase">
            {hasData
              ? "results are real harness runs. hyperbrowser provides the browser; model APIs provide the decisions."
              : "paste a supported url above and run it — results appear here when the real browser sessions finish."}
          </span>
          <span className="font-sans text-[13px] font-extrabold uppercase tracking-[0.14em] border-[3px] border-black shadow-brutal-sm px-3.5 py-2 w-fit">
            built with hyperbrowser sandboxes
          </span>
        </footer>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 border-4 border-black shadow-brutal-lg bg-white p-8 sm:p-12">
      <div className="font-mono text-[11px] uppercase tracking-widest text-gray-400 mb-4">
        no runs yet
      </div>
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight lowercase mb-3">
        run a site to see results
      </h2>
      <p className="text-gray-500 font-semibold max-w-xl leading-snug">
        paste a supported url in the box above and click run site. the app opens
        real hyperbrowser sessions, compares glm-5.2 against closed models, and
        shows where each one breaks.
      </p>
    </div>
  );
}
