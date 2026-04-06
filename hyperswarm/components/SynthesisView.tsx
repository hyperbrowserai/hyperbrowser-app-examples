"use client";

import type { SwarmSynthesis } from "@/lib/types";
import { motion } from "framer-motion";
import { Copy, Download, Share2 } from "lucide-react";

type Props = {
  synthesis: SwarmSynthesis;
  onCopy: () => void;
  onDownload: () => void;
  onShare: () => void;
};

export function SynthesisView({
  synthesis,
  onCopy,
  onDownload,
  onShare,
}: Props) {
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-6 shadow-sm sm:p-7"
    >
      <p className="font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-zinc-500">
        Run summary
      </p>
      <p className="mt-2 font-sans text-[11px] font-normal leading-relaxed text-zinc-500">
        {synthesis.agentsCount} agents · {synthesis.sitesVisited} sites ·{" "}
        {synthesis.resultsCount} results · {fmt(synthesis.durationMs)}
      </p>

      <div className="mt-5 border-l-2 border-zinc-900 pl-4">
        <h2 className="font-sans text-[17px] font-normal leading-snug tracking-tight text-zinc-950">
          {synthesis.headline}
        </h2>
      </div>

      <div className="mt-5">
        <p className="mb-2 font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-zinc-500">
          Recommendation
        </p>
        <p className="font-sans text-[14px] font-normal leading-[1.65] text-zinc-700">
          {synthesis.recommendation}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 font-sans text-[12px] font-normal text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50"
        >
          <Copy className="size-3.5 text-zinc-500" aria-hidden />
          Copy results
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 font-sans text-[12px] font-normal text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50"
        >
          <Download className="size-3.5 text-zinc-500" aria-hidden />
          Download Markdown
        </button>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 font-sans text-[12px] font-normal text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50"
        >
          <Share2 className="size-3.5 text-zinc-500" aria-hidden />
          Share
        </button>
      </div>
    </motion.div>
  );
}
