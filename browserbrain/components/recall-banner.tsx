"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { relativeTime, secs } from "@/lib/format";

export function RecallBanner({
  domain,
  learnedAt,
  recallMs,
  learnMs,
}: {
  domain: string;
  learnedAt: string;
  recallMs: number;
  learnMs?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="border border-white/10 bg-black p-5"
    >
      <div className="flex items-center gap-2 text-sm text-white/90">
        <Zap className="h-4 w-4" />
        Recalled <span className="font-mono">{domain}</span> from memory. Learned{" "}
        {relativeTime(learnedAt)}. No re-analysis needed.
      </div>

      <div className="mt-4 flex items-stretch gap-3">
        {learnMs != null && (
          <div className="flex-1 border border-white/10 px-4 py-3">
            <div className="font-mono text-[10px] text-white/40">Learned in</div>
            <div className="font-mono mt-1 text-2xl tabular-nums text-white/35 line-through decoration-1">
              {secs(learnMs)}
            </div>
          </div>
        )}
        <div className="flex-1 border border-white/30 bg-white/[0.04] px-4 py-3">
          <div className="font-mono text-[10px] text-white/70">Recalled in</div>
          <div className="font-mono mt-1 text-2xl tabular-nums text-foreground">{secs(recallMs)}</div>
        </div>
        {learnMs != null && learnMs > 0 && (
          <div className="flex flex-col items-center justify-center border border-white/10 px-4 py-3">
            <div className="font-mono text-[10px] text-white/40">Faster</div>
            <div className="font-mono mt-1 text-2xl tabular-nums text-foreground">
              {Math.max(1, Math.round(learnMs / Math.max(recallMs, 1)))}x
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
