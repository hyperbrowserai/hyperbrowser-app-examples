"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";

interface HeroInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function HeroInput({ onSubmit, disabled, compact }: HeroInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    let url = trimmed;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    onSubmit(url);
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 220, damping: 30 }}
      className={compact ? "w-full" : "w-full max-w-2xl mx-auto"}
    >
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            placeholder="Paste any URL..."
            spellCheck={false}
            autoComplete="off"
            className="flex-1 h-14 px-5 text-[17px] bg-surface border border-foreground outline-none placeholder:text-neutral-400 disabled:opacity-50 transition-shadow focus:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
          />
          <motion.button
            type="submit"
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="h-14 px-7 inline-flex items-center justify-center gap-2 bg-foreground text-background text-[15px] font-medium tracking-tight hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </motion.button>
        </div>
        {!compact && (
          <p className="mt-4 text-center text-sm text-neutral-500">
            Powered by Hyperbrowser Fetch API
          </p>
        )}
      </form>
    </motion.div>
  );
}
