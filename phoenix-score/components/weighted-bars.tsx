"use client";

import { motion } from "framer-motion";
import type { Breakdown, Predictions } from "@/lib/types";

interface WeightedBarsProps {
  predictions: Predictions;
  breakdown: Breakdown;
}

interface BarRow {
  key: string;
  label: string;
  multiplier: string;
  value: number;
}

export function WeightedBars({ predictions, breakdown }: WeightedBarsProps) {
  const positives: BarRow[] = [
    { key: "repost", label: "Repost", multiplier: "20.0x", value: breakdown.repostWeighted },
    { key: "quote", label: "Quote", multiplier: "15.0x", value: breakdown.quoteWeighted },
    { key: "reply", label: "Reply", multiplier: "13.5x", value: breakdown.replyWeighted },
    {
      key: "profile_click",
      label: "Profile Click",
      multiplier: "12.0x",
      value: breakdown.profileClickWeighted,
    },
    { key: "bookmark", label: "Bookmark", multiplier: "10.0x", value: breakdown.bookmarkWeighted },
    { key: "share", label: "Share", multiplier: "8.0x", value: breakdown.shareWeighted },
    { key: "favorite", label: "Favorite", multiplier: "1.0x", value: breakdown.favoriteWeighted },
  ].sort((a, b) => b.value - a.value);

  const max = Math.max(...positives.map((b) => b.value), 0.001);

  const negatives: BarRow[] = [
    { key: "not_interested", label: "Not Interested", multiplier: "", value: predictions.not_interested },
    { key: "mute_author", label: "Mute Author", multiplier: "", value: predictions.mute_author },
    { key: "block_author", label: "Block Author", multiplier: "", value: predictions.block_author },
    { key: "report", label: "Report", multiplier: "", value: predictions.report },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-[#525252]">
          Weighted Positives
        </h3>
        <ul className="space-y-2">
          {positives.map((row, i) => (
            <motion.li
              key={row.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              whileHover={{ x: 4 }}
              className="group"
            >
              <div className="flex items-baseline justify-between gap-3 font-mono text-[13px]">
                <span className="text-[#fafafa]">{row.label}</span>
                <span className="flex items-center gap-3">
                  <span className="text-[11px] text-[#525252]">{row.multiplier}</span>
                  <span className="tabular-nums text-[#a3a3a3]">{row.value.toFixed(2)}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 bg-[#171717]">
                <motion.div
                  className="h-full bg-[#fafafa]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(row.value / max) * 100}%` }}
                  transition={{ delay: i * 0.08 + 0.1, duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-[#525252]">
          Negative Signals
        </h3>
        <ul className="space-y-2">
          {negatives.map((row, i) => (
            <motion.li
              key={row.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06, duration: 0.4, ease: "easeOut" }}
            >
              <div className="flex items-baseline justify-between gap-3 font-mono text-[12px]">
                <span className="text-[#a3a3a3]">{row.label}</span>
                <span className="tabular-nums text-[#737373]">{row.value.toFixed(2)}</span>
              </div>
              <div className="mt-1.5 h-px border-t border-dashed border-[#262626]">
                <motion.div
                  className="h-px bg-[#525252]"
                  initial={{ width: 0 }}
                  animate={{ width: `${row.value * 100}%` }}
                  transition={{ delay: 0.4 + i * 0.06 + 0.1, duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
