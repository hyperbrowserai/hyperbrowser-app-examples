"use client";

import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface ShareButtonProps {
  score: number;
}

export function ShareButton({ score }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `My tweet scored ${score}/100 on the open-source X algorithm. phoenixscore.hyperbrowser.ai`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available
    }
  };

  return (
    <motion.button
      onClick={handleCopy}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center gap-2 border border-[#262626] bg-transparent px-4 py-2.5 font-mono text-[12px] text-[#fafafa] transition-colors hover:bg-[#171717]"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
          Share
        </>
      )}
    </motion.button>
  );
}
