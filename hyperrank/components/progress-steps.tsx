"use client";

import { Check } from "lucide-react";
import type { EngineKey } from "@/lib/types";

interface ProgressStepsProps {
  step: 0 | 1 | 2 | 3 | 4 | 5;
  stepLabel: string;
  engineProgress: Record<EngineKey, { completed: number; total: number }>;
}

const STEPS = [
  { id: 1, label: "Fetch" },
  { id: 2, label: "Prompts" },
  { id: 3, label: "Query" },
  { id: 4, label: "Analyze" },
  { id: 5, label: "Score" },
] as const;

export function ProgressSteps({
  step,
  stepLabel,
  engineProgress,
}: ProgressStepsProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="border-4 border-black bg-white p-6 shadow-brutal">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-lg">{stepLabel || "Starting…"}</p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {STEPS.map((s) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <li
                key={s.id}
                className={`border-4 border-black p-3 text-xs uppercase tracking-wider font-bold flex items-center gap-2 ${
                  done
                    ? "bg-black text-white"
                    : active
                      ? "bg-yellow-300 text-black"
                      : "bg-white text-gray-400"
                }`}
              >
                {done ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <span className="w-3 text-center">{s.id}</span>
                )}
                <span className="truncate">{s.label}</span>
              </li>
            );
          })}
        </ol>

        {step === 3 ? (
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <EngineLine
              name="ChatGPT"
              completed={engineProgress.chatgpt.completed}
              total={engineProgress.chatgpt.total}
            />
            <EngineLine
              name="Claude"
              completed={engineProgress.claude.completed}
              total={engineProgress.claude.total}
            />
            <EngineLine
              name="Perplexity"
              completed={engineProgress.perplexity.completed}
              total={engineProgress.perplexity.total}
            />
            <EngineLine
              name="Google"
              completed={engineProgress.google.completed}
              total={engineProgress.google.total}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EngineLine({
  name,
  completed,
  total,
}: {
  name: string;
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="border-2 border-black bg-gray-50 p-3">
      <div className="flex items-center justify-between text-xs uppercase font-bold mb-2">
        <span>{name}</span>
        <span className="font-mono">
          {completed}/{total || "—"}
        </span>
      </div>
      <div className="h-2 border-2 border-black bg-white overflow-hidden">
        <div
          className="h-full bg-black transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
