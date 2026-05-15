"use client";

import { motion } from "framer-motion";
import { Card, SectionLabel } from "./result-container";
import type { KeyFact } from "@/lib/types";

interface FactsCardProps {
  facts: KeyFact[];
}

export function FactsCard({ facts }: FactsCardProps) {
  if (!facts.length) return null;

  return (
    <Card className="p-8 sm:p-10">
      <SectionLabel>{`Key facts. ${facts.length}`}</SectionLabel>

      <ul className="divide-y divide-border/60">
        {facts.map((fact, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -12, backgroundColor: "rgba(17,17,17,0.06)" }}
            animate={{
              opacity: 1,
              x: 0,
              backgroundColor: "rgba(17,17,17,0)",
            }}
            transition={{
              delay: 0.9 + i * 0.06,
              duration: 0.45,
              ease: "easeOut",
              backgroundColor: { delay: 0.9 + i * 0.06 + 0.35, duration: 0.5 },
            }}
            whileHover={{ x: 4 }}
            className="flex items-start gap-4 py-4 pl-4 -ml-4 border-l-2 border-border hover:border-foreground"
          >
            <span className="flex-shrink-0 mt-1 text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400 w-20">
              {fact.category}
            </span>
            <span className="text-[15px] leading-relaxed text-foreground flex-1">
              {fact.fact}
            </span>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}
