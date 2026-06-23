"use client";

import { ArrowRight, Globe } from "lucide-react";

const EXAMPLES = ["stripe.com", "vercel.com", "hyperbrowser.ai", "news.ycombinator.com"];

export function UrlInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <div className="w-full border-b border-white/10 p-6">
      <div className="flex gap-4">
        <div className="flex flex-1 items-center gap-3 border border-white/20 bg-black px-4 transition-colors focus-within:border-white/60">
          <Globe className="h-4 w-4 shrink-0 text-white/40" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !disabled) onSubmit();
            }}
            placeholder="ENTER URL TO LEARN"
            spellCheck={false}
            disabled={disabled}
            className="font-mono flex-1 bg-transparent py-3 text-sm text-white placeholder:text-white/40 focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="font-mono flex items-center gap-2 bg-white px-8 py-3 text-sm text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {disabled ? "LEARNING..." : "LEARN"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => onChange(ex)}
            disabled={disabled}
            className="font-mono border border-white/10 px-3 py-1 text-[10px] text-white/40 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
