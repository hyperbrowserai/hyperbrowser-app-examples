"use client";

import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { Card, SectionLabel } from "./result-container";
import type { ExtractedStat } from "@/lib/types";

interface StatsCardProps {
  stats: ExtractedStat[];
}

function parseNumeric(value: string): { num: number; suffix: string; prefix: string } | null {
  const match = value.match(/^([^\d\-]*)(-?\d[\d,.]*)(.*)$/);
  if (!match) return null;
  const prefix = match[1] ?? "";
  const raw = match[2].replace(/,/g, "");
  const num = parseFloat(raw);
  if (Number.isNaN(num)) return null;
  return { num, prefix, suffix: match[3] ?? "" };
}

function AnimatedNumber({ value }: { value: string }) {
  const parsed = parseNumeric(value);
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(parsed ? "0" : value);

  useEffect(() => {
    if (!parsed) return;
    const controls = animate(mv, parsed.num, {
      duration: 1.2,
      ease: "easeOut",
    });
    const isInt = Number.isInteger(parsed.num);
    const unsub = mv.on("change", (latest) => {
      setDisplay(
        isInt ? Math.round(latest).toLocaleString() : latest.toFixed(1),
      );
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [parsed, mv]);

  if (!parsed) return <>{value}</>;
  return (
    <>
      {parsed.prefix}
      {display}
      {parsed.suffix}
    </>
  );
}

export function StatsCard({ stats }: StatsCardProps) {
  if (!stats.length) return null;

  return (
    <Card className="p-8 sm:p-10">
      <SectionLabel>{`Stats. ${stats.length}`}</SectionLabel>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 240, damping: 26 }}
            className="bg-subtle border border-border p-6 flex flex-col"
          >
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-neutral-500 mb-3">
              {stat.label}
            </div>
            <div className="text-[34px] font-semibold tracking-tight text-black leading-none">
              <AnimatedNumber value={stat.value} />
            </div>
            {stat.context && (
              <div className="mt-3 text-xs text-neutral-500 leading-relaxed">
                {stat.context}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
