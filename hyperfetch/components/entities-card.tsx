"use client";

import { motion } from "framer-motion";
import { Card, SectionLabel } from "./result-container";
import type { ExtractedEntities } from "@/lib/types";

interface EntitiesCardProps {
  entities: ExtractedEntities;
}

const GROUPS: { key: keyof ExtractedEntities; label: string }[] = [
  { key: "companies", label: "Companies" },
  { key: "people", label: "People" },
  { key: "products", label: "Products" },
  { key: "technologies", label: "Technologies" },
];

export function EntitiesCard({ entities }: EntitiesCardProps) {
  const total =
    entities.companies.length +
    entities.people.length +
    entities.products.length +
    entities.technologies.length;

  if (!total) return null;

  let staggerBase = 0;
  const groupStartIndex: Partial<Record<keyof ExtractedEntities, number>> = {};
  for (const { key } of GROUPS) {
    const items = entities[key];
    groupStartIndex[key] = staggerBase;
    staggerBase += items.length;
  }

  return (
    <Card className="p-8 sm:p-10">
      <SectionLabel>{`Entities. ${total}`}</SectionLabel>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {GROUPS.map(({ key, label }) => {
          const items = entities[key];
          if (!items.length) return null;
          const startGroup = groupStartIndex[key]!;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + startGroup * 0.03, duration: 0.3 }}
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-neutral-500 mb-3">
                {label}. {items.length}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <motion.span
                    key={i}
                    initial={{
                      opacity: 0,
                      scale: 0.85,
                      backgroundColor: "rgba(17,17,17,0.12)",
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      backgroundColor: "rgba(236,234,217,1)",
                    }}
                    transition={{
                      delay: 1 + (startGroup + i) * 0.04,
                      duration: 0.35,
                      backgroundColor: {
                        delay: 1 + (startGroup + i) * 0.04 + 0.3,
                        duration: 0.5,
                      },
                    }}
                    whileHover={{ y: -1, scale: 1.04 }}
                    className="inline-flex items-center text-xs text-neutral-800 border border-border px-2.5 py-1"
                  >
                    {item}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
