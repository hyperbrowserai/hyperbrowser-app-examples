"use client";

import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect } from "react";

interface ScoreGaugeProps {
  score: number;
  verdict: string;
}

export function ScoreGauge({ score, verdict }: ScoreGaugeProps) {
  const value = useMotionValue(0);
  const display = useTransform(value, (v) => Math.round(v).toString());

  useEffect(() => {
    const controls = animate(value, score, {
      duration: 1.5,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [score, value]);

  const fillPercent = Math.max(0, Math.min(100, score));

  return (
    <div className="flex flex-col items-center py-10">
      <div className="relative h-48 w-48">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="#1f1f1f"
            strokeWidth="6"
          />
          <motion.circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="#fafafa"
            strokeWidth="6"
            strokeDasharray={2 * Math.PI * 88}
            strokeDashoffset={2 * Math.PI * 88}
            strokeLinecap="round"
            animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - fillPercent / 100) }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span className="font-mono text-6xl font-bold tracking-tight text-[#fafafa]">
            {display}
          </motion.span>
          <span className="mt-1 font-mono text-[11px] uppercase tracking-widest text-[#525252]">
            / 100
          </span>
        </div>
      </div>
      <p className="mt-6 max-w-md text-center font-mono text-[14px] leading-relaxed text-[#a3a3a3]">
        {verdict}
      </p>
    </div>
  );
}
