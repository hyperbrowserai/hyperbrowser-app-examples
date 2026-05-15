"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Fetching page" },
  { id: 2, label: "Extracting content" },
  { id: 3, label: "Structuring dataset" },
  { id: 4, label: "Done" },
];

interface ProgressStepsProps {
  current: number;
}

export function ProgressSteps({ current }: ProgressStepsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <ul className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const isDone = current > step.id || current === 4;
          const isActive = current === step.id && current !== 4;
          const isPending = current < step.id;

          return (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35, ease: "easeOut" }}
              className="flex items-center gap-3"
            >
              <div className="relative h-7 w-7 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {isDone ? (
                    <motion.div
                      key="done"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className="h-7 w-7 rounded-full bg-black flex items-center justify-center"
                    >
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      key="active"
                      className="h-7 w-7 rounded-full border-2 border-black relative overflow-hidden"
                    >
                      <motion.div
                        animate={{ scale: [0.5, 1, 0.5], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-1 rounded-full bg-black"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pending"
                      className="h-7 w-7 rounded-full border-2 border-neutral-200"
                    />
                  )}
                </AnimatePresence>
              </div>

              <span
                className={`text-[15px] tracking-tight transition-colors ${
                  isPending
                    ? "text-neutral-400"
                    : isActive
                      ? "text-black font-medium"
                      : "text-neutral-700"
                }`}
              >
                {step.label}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
