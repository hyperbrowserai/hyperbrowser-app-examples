"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import type { TaskResult } from "@/lib/types";

interface Props {
  failures: TaskResult[];
}

export function FailureLog({ failures }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  if (!failures || failures.length === 0) return null;

  return (
    <div className="border-4 border-black bg-white shadow-brutal">
      <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500 px-6 pt-6 pb-4">
        Failure Log — {failures.length} Tasks
      </h2>
      <ul>
        {failures.map((result, i) => {
          const isOpen = open === i;
          const failCount = result.failures.length;
          return (
            <li key={i} className="border-t-4 border-black">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-100 transition-colors"
              >
                <span
                  className={`flex items-center justify-center w-7 h-7 border-2 border-black shrink-0 ${
                    result.succeeded ? "bg-white" : "bg-black text-white"
                  }`}
                >
                  {result.succeeded ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <X size={14} strokeWidth={3} />
                  )}
                </span>
                <span className="flex-1 text-sm font-bold text-black leading-snug">
                  {result.task}
                </span>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {failCount} {failCount === 1 ? "failure" : "failures"}
                </span>
                <ChevronDown
                  size={18}
                  strokeWidth={2.5}
                  className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 flex flex-col gap-4">
                      {result.steps_taken.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                            Steps taken
                          </p>
                          <ul className="list-disc pl-5 text-sm text-gray-700 font-medium space-y-0.5">
                            {result.steps_taken.map((s, j) => (
                              <li key={j}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.failures.map((f, j) => (
                        <div key={j} className="border-2 border-black p-4 bg-white">
                          <p className="text-sm font-bold text-black mb-2">
                            {f.what_went_wrong}
                          </p>
                          <div className="grid sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                Assumed
                              </p>
                              <p className="text-gray-700 font-medium">{f.wrong_assumption}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                Reality
                              </p>
                              <p className="text-gray-700 font-medium">{f.actual_truth}</p>
                            </div>
                          </div>
                          {f.affected_files.length > 0 && (
                            <p className="mt-2 text-xs font-mono text-gray-500 break-all">
                              {f.affected_files.join(", ")}
                            </p>
                          )}
                        </div>
                      ))}

                      {result.commands_that_failed.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                            Commands that failed
                          </p>
                          <div className="border-2 border-black bg-[#141414] text-gray-100 px-4 py-3 font-mono text-xs space-y-1 overflow-x-auto">
                            {result.commands_that_failed.map((c, j) => (
                              <div key={j}>
                                <span className="text-gray-500">$ </span>
                                {c}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.parseError && result.raw && (
                        <p className="text-xs text-gray-400 font-mono">{result.raw}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
