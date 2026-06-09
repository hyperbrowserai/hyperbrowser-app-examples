"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Props {
  issues: string[];
}

export function TopIssues({ issues }: Props) {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="border-4 border-black bg-white shadow-brutal p-6 md:p-8">
      <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500 mb-5">
        Top Issues
      </h2>
      <ul className="flex flex-col gap-3">
        {issues.slice(0, 3).map((issue, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="flex items-start gap-3 border-2 border-black p-3"
          >
            <span className="shrink-0 mt-0.5 text-black">
              <AlertTriangle size={18} strokeWidth={2.5} />
            </span>
            <span className="text-sm md:text-base font-medium text-black leading-snug">
              {issue}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
