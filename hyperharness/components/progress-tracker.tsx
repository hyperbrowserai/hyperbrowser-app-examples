"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type { Scan, ScanStatus } from "@/lib/types";

interface Props {
  scan: Scan;
}

const STAGES: { key: ScanStatus; label: string }[] = [
  { key: "cloning", label: "Cloning repository" },
  { key: "installing", label: "Installing dependencies" },
  { key: "analyzing", label: "Analyzing structure" },
  { key: "testing", label: "Running agent test tasks" },
  { key: "generating", label: "Generating harness from failures" },
  { key: "scoring", label: "Calculating HarnessScore" },
];

const ORDER: ScanStatus[] = [
  "cloning",
  "installing",
  "analyzing",
  "testing",
  "generating",
  "scoring",
  "complete",
];

export function ProgressTracker({ scan }: Props) {
  const currentIndex = ORDER.indexOf(scan.status);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border-4 border-black bg-white shadow-brutal-lg p-6 sm:p-8">
        <ul className="flex flex-col gap-1">
          {STAGES.map((stage, i) => {
            const stageIndex = ORDER.indexOf(stage.key);
            const done = currentIndex > stageIndex;
            const active = scan.status === stage.key;
            const label =
              active && stage.key === "testing"
                ? `${stage.label} (${scan.currentTask}/${scan.totalTasks})`
                : stage.label;

            return (
              <motion.li
                key={stage.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className="flex items-center gap-4 py-2"
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 border-2 border-black shrink-0 ${
                    done ? "bg-black text-white" : active ? "bg-yellow-300" : "bg-white"
                  }`}
                >
                  {done ? (
                    <Check size={16} strokeWidth={3} />
                  ) : active ? (
                    <Loader2 size={16} strokeWidth={3} className="animate-spin" />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                  )}
                </span>
                <span
                  className={`text-sm sm:text-base font-bold ${
                    done ? "text-gray-400" : active ? "text-black" : "text-gray-300"
                  }`}
                >
                  {label}
                </span>
                {active && (
                  <motion.span
                    className="ml-auto w-2 h-2 bg-black rounded-full"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
