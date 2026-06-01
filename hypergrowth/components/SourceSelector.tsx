"use client";

import { Check } from "lucide-react";
import type { SignalSource } from "@/lib/types";

const sources: { id: SignalSource; label: string; description: string }[] = [
  {
    id: "hackernews",
    label: "Hacker News",
    description: "Developer infra and launch discussion",
  },
  {
    id: "github",
    label: "GitHub Issues",
    description: "Concrete failures and workflow pain",
  },
  {
    id: "reddit",
    label: "Reddit",
    description: "Messy community demand signals",
  },
];

type SourceSelectorProps = {
  value: SignalSource[];
  onChange: (value: SignalSource[]) => void;
};

export function SourceSelector({ value, onChange }: SourceSelectorProps) {
  function toggle(source: SignalSource) {
    if (value.includes(source)) {
      const next = value.filter((item) => item !== source);
      onChange(next.length ? next : value);
      return;
    }

    onChange([...value, source]);
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {sources.map((source) => {
        const selected = value.includes(source.id);

        return (
          <button
            key={source.id}
            type="button"
            onClick={() => toggle(source.id)}
            className={`rounded-lg border p-4 text-left transition ${
              selected
                ? "border-foreground bg-foreground text-white"
                : "border-line bg-panel text-foreground hover:border-foreground"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{source.label}</span>
              <span
                className={`grid size-5 place-items-center rounded-full border ${
                  selected
                    ? "border-accent text-accent"
                    : "border-line text-transparent"
                }`}
              >
                <Check size={13} strokeWidth={3} />
              </span>
            </div>
            <p
              className={`mt-2 text-xs leading-5 ${
                selected ? "text-zinc-300" : "text-muted"
              }`}
            >
              {source.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
