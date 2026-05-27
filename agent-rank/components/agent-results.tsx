"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { AGENT_LABELS, AGENT_ORDER, type Scorecard } from "@/lib/types";

interface Props {
  scorecard: Scorecard;
}

export function AgentResults({ scorecard }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
        Agent Results
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENT_ORDER.map((name, i) => {
          const a = scorecard.agents[name];
          if (!a) return null;
          const passed = a.passed;
          return (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              className={`flex flex-col gap-3 p-5 border-4 border-black bg-white shadow-brutal ${
                passed ? "" : "opacity-80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-black">
                  {AGENT_LABELS[name]}
                </span>
                {passed ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white bg-black border-2 border-black px-2 py-0.5">
                    <Check size={10} strokeWidth={3} /> Pass
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-600 border-2 border-gray-400 px-2 py-0.5 bg-gray-100">
                    <X size={10} strokeWidth={3} /> Fail
                  </span>
                )}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {a.steps} steps
              </div>
              <p className="text-sm text-gray-700 leading-relaxed font-medium">
                {a.summary}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
