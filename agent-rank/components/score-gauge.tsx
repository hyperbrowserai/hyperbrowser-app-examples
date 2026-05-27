"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  score: number;
  verdict: string;
}

export function ScoreGauge({ score, verdict }: Props) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, score, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [score, count, rounded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center text-center py-12 px-6 border-4 border-black bg-white shadow-brutal-lg"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-4">
        Agent Operability Score
      </span>
      <div className="flex items-baseline gap-2 leading-none">
        <span className="text-[120px] md:text-[160px] font-bold tabular-nums tracking-tighter text-black">
          {display}
        </span>
        <span className="text-3xl font-bold text-gray-400">/100</span>
      </div>
      <p className="mt-6 max-w-xl text-gray-700 text-base md:text-lg font-medium leading-relaxed">
        {verdict}
      </p>
    </motion.div>
  );
}
