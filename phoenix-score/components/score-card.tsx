"use client";

import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import type { ScoreResult } from "@/lib/types";
import { ScoreGauge } from "./score-gauge";
import { WeightedBars } from "./weighted-bars";
import { SignalsList } from "./signals-list";
import { SuggestionsList } from "./suggestions-list";
import { ShareButton } from "./share-button";

interface ScoreCardProps {
  result: ScoreResult;
  onReset: () => void;
}

export function ScoreCard({ result, onReset }: ScoreCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="border border-[#262626] bg-[#0f0f0f] shadow-brutal-dark"
    >
      <div className="border-b border-[#1f1f1f] px-8 py-8">
        <ScoreGauge score={result.score} verdict={result.verdict} />
      </div>

      <div className="space-y-10 px-8 py-8">
        <WeightedBars predictions={result.predictions} breakdown={result.breakdown} />
        <SignalsList signals={result.signals} />
        <SuggestionsList suggestions={result.suggestions} />
      </div>

      <div className="flex flex-col gap-4 border-t border-[#1f1f1f] px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <motion.button
            onClick={onReset}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 bg-[#fafafa] px-4 py-2.5 font-mono text-[12px] text-[#0a0a0a] transition-opacity hover:opacity-90"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
            Score another tweet
          </motion.button>
          <ShareButton score={result.score} />
        </div>
        <p className="max-w-md font-mono text-[10px] leading-relaxed text-[#525252]">
          Scored using documented weights from xai-org/x-algorithm. Not the production model weights.
        </p>
      </div>
    </motion.div>
  );
}
