"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  task: string;
  liveUrl: string | null;
  seconds: number | null;
}

export function ShareButton({ task, liveUrl, seconds }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const time = seconds != null ? `${seconds}s` : "record time";
    const text = `Watched an agent build "${task}" on a live cloud computer in ${time}. ${
      liveUrl ?? ""
    } — built on Hyperbrowser Sandboxes.`.trim();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:opacity-90"
    >
      {copied ? <Check size={16} strokeWidth={2.5} /> : <Share2 size={16} strokeWidth={2.5} />}
      {copied ? "Copied to clipboard" : "Share"}
    </button>
  );
}
