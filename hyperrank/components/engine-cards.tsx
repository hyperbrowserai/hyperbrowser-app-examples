import { Lock, Sparkles, Globe, Bot, Brain } from "lucide-react";
import type { EngineKey, EngineScore, Sentiment } from "@/lib/types";

interface EngineCardsProps {
  scores: Record<EngineKey, EngineScore>;
}

const ENGINES: { key: EngineKey; name: string; Icon: typeof Bot }[] = [
  { key: "chatgpt", name: "ChatGPT", Icon: Bot },
  { key: "claude", name: "Claude", Icon: Brain },
  { key: "perplexity", name: "Perplexity", Icon: Sparkles },
  { key: "google", name: "Google", Icon: Globe },
];

function sentimentChip(sentiment: Sentiment): { label: string; classes: string } {
  switch (sentiment) {
    case "positive":
      return { label: "Positive", classes: "bg-green-300 text-black" };
    case "neutral":
      return { label: "Neutral", classes: "bg-gray-200 text-black" };
    case "negative":
      return { label: "Negative", classes: "bg-red-300 text-black" };
    case "not_mentioned":
      return { label: "Not mentioned", classes: "bg-yellow-200 text-black" };
    case "unavailable":
      return { label: "Login required", classes: "bg-gray-100 text-gray-500" };
  }
}

export function EngineCards({ scores }: EngineCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {ENGINES.map(({ key, name, Icon }) => {
        const data = scores[key];
        const isUnavailable = data.sentiment === "unavailable";
        const chip = sentimentChip(data.sentiment);
        return (
          <div
            key={key}
            className={`border-4 border-black p-5 shadow-brutal flex flex-col gap-4 ${
              isUnavailable ? "bg-gray-50" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest">
                <Icon size={18} strokeWidth={2.5} />
                <span>{name}</span>
              </div>
              {isUnavailable ? (
                <Lock size={16} strokeWidth={2.5} className="text-gray-400" />
              ) : null}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tighter">
                {data.score === null ? "—" : Math.round(data.score)}
              </span>
              {data.score !== null ? (
                <span className="text-sm font-bold text-gray-400">/ 100</span>
              ) : null}
            </div>

            <div className="flex items-center justify-between text-xs uppercase font-bold tracking-widest">
              <span className="text-gray-500">Mention rate</span>
              <span className="font-mono">{data.mentionRate}</span>
            </div>

            <div
              className={`mt-auto inline-block self-start px-2 py-1 border-2 border-black text-xs uppercase font-bold tracking-widest ${chip.classes}`}
            >
              {chip.label}
            </div>

            {isUnavailable ? (
              <p className="text-xs text-gray-500 leading-relaxed">
                Engine unavailable for this scan.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
