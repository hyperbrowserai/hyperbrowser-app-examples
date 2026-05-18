"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";

interface TweetInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function TweetInput({ value, onChange, onSubmit, disabled }: TweetInputProps) {
  const charCount = value.length;
  const isUrl = useMemo(
    () => /^https:\/\/(x|twitter)\.com\//i.test(value.trim()),
    [value],
  );

  const countColor =
    charCount > 280
      ? "text-[#a3a3a3]"
      : charCount > 240
      ? "text-[#a3a3a3]"
      : "text-[#525252]";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }}
      className="w-full"
    >
      <div className="relative border border-[#262626] bg-[#0f0f0f] focus-within:border-[#525252] transition-colors">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your tweet or a tweet URL..."
          rows={5}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-5 py-4 font-mono text-[15px] leading-relaxed text-[#fafafa] placeholder:text-[#525252] focus:outline-none disabled:opacity-50"
        />
        <div className={`flex justify-end px-5 pb-3 font-mono text-[11px] ${countColor}`}>
          {isUrl ? "URL" : `${charCount}/280`}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-mono text-[11px] text-[#525252]">
          <div>Powered by Hyperbrowser</div>
          <div className="mt-1 text-[10px] text-[#404040]">
            Paste text for a draft score. Paste a URL to analyze a live tweet.
          </div>
        </div>
        <motion.button
          type="submit"
          disabled={disabled || !value.trim()}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-full bg-[#fafafa] px-6 py-3 font-mono text-[13px] font-medium text-[#0a0a0a] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Score
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </motion.button>
      </div>
    </form>
  );
}
