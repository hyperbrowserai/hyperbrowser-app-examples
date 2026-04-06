"use client";

import type { RankedResult } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { ListOrdered } from "lucide-react";
import { ResultCard } from "@/components/ResultCard";

type Props = { results: RankedResult[] };

export function ResultsPanel({ results }: Props) {
  return (
    <aside className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 -mx-1 border-b border-zinc-200 bg-white/95 pb-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 shrink-0 text-zinc-400" aria-hidden />
          <h2 className="font-sans text-[11px] font-normal uppercase tracking-[0.16em] text-zinc-600">
            Results
          </h2>
          <span className="font-sans text-[11px] font-normal tabular-nums text-zinc-400">
            {results.length} found
          </span>
        </div>
      </div>
      <div className="flex max-h-[min(72vh,760px)] flex-col gap-4 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]">
        <AnimatePresence initial={false}>
          {results.map((r) => (
            <motion.div
              key={`${r.rank}-${r.title}`}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <ResultCard item={r} />
            </motion.div>
          ))}
        </AnimatePresence>
        {results.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center font-sans text-[13px] font-normal text-zinc-500">
            No ranked results yet. They will appear as agents finish.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
