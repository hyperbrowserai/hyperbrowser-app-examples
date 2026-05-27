"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Scan } from "@/lib/types";

interface Props {
  scan: Scan;
}

export function ShareButton({ scan }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!scan.scorecard) return;
    const passed = Object.values(scan.scorecard.agents).filter(
      (a) => a.passed
    ).length;
    const text = `${scan.url} scored ${scan.scorecard.score}/100 on AgentRank. ${passed}/3 agents completed the task. agentrank.hyperbrowser.ai`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-5 h-12 font-bold text-sm uppercase tracking-widest border-4 border-black bg-white text-black hover:bg-black hover:text-white transition-colors shadow-brutal hover:shadow-brutal-sm"
    >
      {copied ? (
        <>
          <Check size={14} strokeWidth={2.5} /> Copied
        </>
      ) : (
        <>
          <Copy size={14} strokeWidth={2.5} /> Share
        </>
      )}
    </button>
  );
}
