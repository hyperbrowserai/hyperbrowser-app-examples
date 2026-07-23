"use client";

import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { Ticker } from "./ticker";
import type { RunState } from "@/lib/use-swarm";

const K3_INPUT_PRICE_PER_M = 3; // USD / 1M tokens (est) — mirrors server CONFIG

export function BrainMeter({ state }: { state: RunState }) {
  const hardLimit = state.hardLimit || 1_000_000;
  const tokens = state.stats?.tokens ?? state.tokens;
  const pages = state.stats?.pages ?? state.pagesRead;
  const fillPct = Math.min(100, (tokens / hardLimit) * 100);
  const budgetPct = Math.min(100, (state.budgetTokens / hardLimit) * 100);
  const capped = state.capped;
  const glow = state.status === "done";

  const costUsd = state.stats?.costUsd ?? (tokens / 1_000_000) * K3_INPUT_PRICE_PER_M;

  return (
    <div className="w-full border-t-4 border-black bg-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center h-6 w-6 bg-black text-white border-2 border-black">
              <Cpu size={13} strokeWidth={2.5} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest">
              Kimi K3 · Shared Context
            </span>
            {capped && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-black border-2 border-black px-1.5 py-0.5 bg-[var(--accent)]">
                Context full
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] tnum text-gray-500">
            est ~${costUsd.toFixed(2)}{" "}
            <span className="text-gray-300">· K3 input ~${K3_INPUT_PRICE_PER_M}/M</span>
          </div>
        </div>

        {/* The meter */}
        <div className="relative h-7 border-2 border-black bg-white overflow-hidden">
          <motion.div
            className={`h-full ${glow ? "bg-black animate-[meter-glow_1.6s_ease-in-out_infinite]" : "bg-black"}`}
            initial={{ width: 0 }}
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {/* budget marker */}
          <div
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-gray-400"
            style={{ left: `${budgetPct}%` }}
          >
            <span className="absolute -top-[1px] left-1 font-mono text-[8px] uppercase tracking-widest text-gray-400">
              budget
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-gray-600">
          <span>
            pages read: <Ticker value={pages} className="text-black font-medium" />
          </span>
          <span className="tnum">
            context: <Ticker value={tokens} className="text-black font-medium" /> /{" "}
            {hardLimit.toLocaleString()} tok{" "}
            <span className="text-gray-400">(est)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
