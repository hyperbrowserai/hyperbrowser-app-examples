"use client";

import { motion } from "framer-motion";
import { Brain, Database } from "lucide-react";
import { relativeTime } from "@/lib/format";
import type { BrainSummary } from "@/lib/types";

export function BrainPanel({
  domains,
  onPick,
  mode,
}: {
  domains: BrainSummary[];
  onPick: (url: string) => void;
  mode: "volume" | "local";
}) {
  return (
    <div className="flex h-full flex-col bg-black">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-white/70" />
          <h2 className="font-mono text-xs text-white/60">Memory Index</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          BrowserBrain remembers{" "}
          <span className="font-mono text-white">{domains.length}</span>{" "}
          {domains.length === 1 ? "site" : "sites"}.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {domains.length === 0 && (
          <p className="font-mono text-xs text-white/40">NO MEMORY DATA</p>
        )}
        {domains.map((d, i) => (
          <motion.button
            key={d.domain}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onPick(d.url)}
            className="flex w-full items-center justify-between border-b border-white/5 px-1 py-3 text-left transition-colors hover:bg-white/5"
          >
            <div className="min-w-0">
              <div className="font-mono truncate text-xs text-white">{d.domain}</div>
              <div className="mt-1 text-xs text-white/40">{d.pageType}</div>
            </div>
            <div className="font-mono shrink-0 pl-3 text-right text-[10px] text-white/30">
              {relativeTime(d.learnedAt)}
            </div>
          </motion.button>
        ))}
      </div>

      <div className="flex items-start gap-2 border-t border-white/10 p-4 text-xs leading-relaxed text-white/45">
        <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
        <span>
          {mode === "volume" ? (
            <>
              Memory lives in a Hyperbrowser persistent volume. Refresh the page;
              it&apos;s still here.
            </>
          ) : (
            <>
              Durable local brain. Enable <span className="font-mono">sandbox_volumes</span>{" "}
              to move it onto a Hyperbrowser persistent volume.
            </>
          )}
        </span>
      </div>
    </div>
  );
}
