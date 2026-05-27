"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface Props {
  items: string[];
}

export function Recommendations({ items }: Props) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
        Recommendations
      </h3>
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
            className="flex gap-3 items-start p-4 border-4 border-black bg-white shadow-brutal"
          >
            <ArrowRight
              size={18}
              strokeWidth={2.5}
              className="mt-0.5 shrink-0 text-black"
            />
            <p className="text-sm text-black leading-relaxed font-medium">
              {item}
            </p>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
