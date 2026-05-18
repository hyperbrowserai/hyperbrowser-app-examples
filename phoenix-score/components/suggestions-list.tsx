"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface SuggestionsListProps {
  suggestions: string[];
}

export function SuggestionsList({ suggestions }: SuggestionsListProps) {
  return (
    <div>
      <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-[#525252]">
        Suggestions
      </h3>
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05, duration: 0.35, ease: "easeOut" }}
            className="flex items-start gap-3 font-mono text-[13px] leading-relaxed text-[#d4d4d4]"
          >
            <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#525252]" strokeWidth={2.25} />
            <span>{s}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
