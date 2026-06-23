"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { secs } from "@/lib/format";

export function LearnStream({
  domain,
  elapsedMs,
  steps,
  screenshot,
}: {
  domain: string;
  elapsedMs: number;
  steps: string[];
  screenshot?: string;
}) {
  return (
    <div className="border border-white/10 bg-black">
      <div className="flex items-baseline justify-between border-b border-white/10 p-4">
        <p className="font-mono text-xs text-white/60">
          Learning <span className="text-white">{domain}</span>
        </p>
        <span className="font-mono text-xs tabular-nums text-white/40">{secs(elapsedMs)}</span>
      </div>

      <ul className="space-y-0 p-4">
        <AnimatePresence initial={false}>
          {steps.map((label, i) => {
            const done = i < steps.length - 1;
            return (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 border-b border-white/5 py-3 text-sm last:border-0"
              >
                {done ? (
                  <Check className="h-4 w-4 text-white/60" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                )}
                <span className={done ? "text-white/45" : "text-white"}>{label}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <AnimatePresence>
        {screenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="inner-glow overflow-hidden border-t border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshot}
              alt={`${domain} screenshot`}
              className="max-h-[420px] w-full object-cover object-top opacity-90"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
