"use client";

import { motion } from "framer-motion";
import { ScoreGauge } from "./score-gauge";
import { AgentResults } from "./agent-results";
import { IssuesList } from "./issues-list";
import { Recommendations } from "./recommendations";
import { ShareButton } from "./share-button";
import type { Scan } from "@/lib/types";

interface Props {
  scan: Scan;
  onReset: () => void;
}

export function ScoreCard({ scan, onReset }: Props) {
  if (!scan.scorecard) return null;
  const card = scan.scorecard;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col gap-10 max-w-6xl mx-auto"
    >
      <ScoreGauge score={card.score} verdict={card.verdict} />
      <AgentResults scorecard={card} />
      <IssuesList issues={card.issues} />
      <Recommendations items={card.recommendations} />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-4 border-black">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-5 h-12 font-bold text-sm uppercase tracking-widest bg-black text-white border-4 border-black hover:bg-white hover:text-black transition-colors shadow-brutal hover:shadow-brutal-sm"
        >
          Scan another site
        </button>
        <ShareButton scan={scan} />
      </div>

      <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 pt-2">
        Scores are based on real agent runs and may vary between scans.
      </p>
    </motion.div>
  );
}
