import { Check } from "lucide-react";
import { SourceIcon } from "@/components/SourceIcon";
import type { SignalSource } from "@/lib/types";

const sources: {
  id: SignalSource;
  label: string;
  dotColor: string;
  selectedBorder: string;
  selectedBg: string;
  selectedText: string;
}[] = [
  {
    id: "hackernews",
    label: "Hacker News",
    dotColor: "bg-source-hn",
    selectedBorder: "border-source-hn/60",
    selectedBg: "bg-source-hn/12",
    selectedText: "text-source-hn",
  },
  {
    id: "github",
    label: "GitHub",
    dotColor: "bg-source-github",
    selectedBorder: "border-source-github/60",
    selectedBg: "bg-source-github/12",
    selectedText: "text-source-github",
  },
  {
    id: "hyperbrowser",
    label: "Hyperbrowser",
    dotColor: "bg-source-web",
    selectedBorder: "border-source-web/60",
    selectedBg: "bg-source-web/12",
    selectedText: "text-source-web",
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
    <div className="flex items-center gap-2">
      {sources.map((source) => {
        const selected = value.includes(source.id);

        return (
          <button
            key={source.id}
            type="button"
            onClick={() => toggle(source.id)}
            className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
              selected
                ? `${source.selectedBorder} ${source.selectedBg} ${source.selectedText}`
                : "border-line bg-white/[0.03] text-muted hover:border-line hover:text-foreground"
            }`}
          >
            <span className="grid size-5 place-items-center rounded bg-white/[0.04]">
              <SourceIcon source={source.id} size={14} />
            </span>
            {source.label}
            {selected ? (
              <Check size={12} strokeWidth={3} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
