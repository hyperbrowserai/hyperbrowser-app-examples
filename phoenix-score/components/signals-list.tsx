"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import type { Signal } from "@/lib/types";

interface SignalsListProps {
  signals: Signal[];
}

function iconFor(type: Signal["type"]) {
  if (type === "positive") return TrendingUp;
  if (type === "warning") return AlertTriangle;
  return TrendingDown;
}

export function SignalsList({ signals }: SignalsListProps) {
  return (
    <div>
      <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-[#525252]">
        Signals
      </h3>
      <ul className="space-y-3">
        {signals.map((signal, i) => {
          const Icon = iconFor(signal.type);
          return (
            <motion.li
              key={`${signal.label}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: "easeOut" }}
              className="flex gap-3 border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#a3a3a3]" strokeWidth={2} />
              <div className="min-w-0">
                <div className="font-mono text-[13px] text-[#fafafa]">{signal.label}</div>
                <div className="mt-1 font-mono text-[12px] leading-relaxed text-[#737373]">
                  {signal.detail}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
