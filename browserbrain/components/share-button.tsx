"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { secs } from "@/lib/format";

export function ShareButton({
  domain,
  learnMs,
  recallMs,
}: {
  domain: string;
  learnMs?: number;
  recallMs?: number;
}) {
  const [copied, setCopied] = useState(false);

  const text =
    learnMs != null && recallMs != null
      ? `BrowserBrain learned ${domain} in ${secs(learnMs)}, then recalled it in ${secs(recallMs)}. Eyes + memory for your agent, powered by Hyperbrowser Sandboxes.`
      : `BrowserBrain gave my agent eyes and a memory for ${domain}. Powered by Hyperbrowser Sandboxes.`;

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="font-mono flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-[10px] text-white/40 transition-colors hover:border-white/30 hover:text-white"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
