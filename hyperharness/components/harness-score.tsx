"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import type { ScoreData } from "@/lib/types";

interface Props {
  score: ScoreData;
}

function tier(score: number): { bg: string; label: string } {
  if (score >= 90) return { bg: "bg-lime-400", label: "Dominant" };
  if (score >= 70) return { bg: "bg-green-400", label: "Strong" };
  if (score >= 50) return { bg: "bg-yellow-300", label: "Mixed" };
  if (score >= 30) return { bg: "bg-orange-400", label: "Weak" };
  return { bg: "bg-red-400", label: "Invisible" };
}

const BARS: { key: keyof ScoreData["breakdown"]; label: string }[] = [
  { key: "discovery", label: "Discovery" },
  { key: "specificity", label: "Specificity" },
  { key: "testability", label: "Testability" },
  { key: "documentation", label: "Documentation" },
  { key: "structure", label: "Structure" },
];

export function HarnessScore({ score }: Props) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  const t = tier(score.score);

  useEffect(() => {
    const controls = animate(count, score.score, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [score.score, count, rounded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="border-4 border-black bg-white shadow-brutal-lg p-8 md:p-12"
    >
      <div className="flex flex-col items-center text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-6">
          HarnessScore
        </span>
        <div
          className={`relative w-48 h-48 md:w-56 md:h-56 border-4 border-black ${t.bg} shadow-brutal-lg flex flex-col items-center justify-center`}
        >
          <span className="text-7xl md:text-8xl font-black tracking-tighter leading-none tabular-nums">
            {display}
          </span>
          <span className="mt-1 text-xs uppercase font-bold tracking-widest">/ 100</span>
        </div>
        <div className="mt-5 px-3 py-1 border-2 border-black bg-white text-xs uppercase tracking-widest font-bold">
          {t.label}
        </div>
        <p className="mt-6 max-w-xl text-gray-700 text-base md:text-lg font-medium leading-relaxed">
          {score.verdict}
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4 max-w-xl mx-auto">
        {BARS.map((bar, i) => {
          const value = Math.max(0, Math.min(100, score.breakdown?.[bar.key] ?? 0));
          return (
            <div key={bar.key} className="flex items-center gap-4">
              <span className="w-28 sm:w-32 shrink-0 text-xs font-bold uppercase tracking-widest text-black text-right">
                {bar.label}
              </span>
              <div className="flex-1 h-4 border-2 border-black bg-white overflow-hidden">
                <motion.div
                  className="h-full bg-black"
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="w-8 shrink-0 text-xs font-bold tabular-nums text-black">
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
