"use client";

import { Terminal } from "lucide-react";
import { useEffect, useRef } from "react";
import type { TerminalEntry } from "@/lib/types";

interface Props {
  entries: TerminalEntry[];
  lastCommand?: string;
}

export function TerminalStream({ entries, lastCommand }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length, lastCommand]);

  // Show a pending line only if the running command isn't already the last entry.
  const lastEntry = entries[entries.length - 1];
  const showPending =
    lastCommand && (!lastEntry || lastEntry.command !== lastCommand);

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 border-4 border-black bg-[#141414] shadow-brutal-lg">
      <div className="flex items-center gap-2 border-b-2 border-gray-700 px-4 py-2">
        <Terminal size={14} strokeWidth={2.5} className="text-gray-300" />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
          Sandbox
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live
        </span>
      </div>

      <div
        ref={scrollRef}
        className="px-4 py-3 font-mono text-xs leading-relaxed text-gray-100 max-h-80 overflow-y-auto overflow-x-hidden"
      >
        {entries.length === 0 && !showPending && (
          <p className="text-gray-500">Waiting for the agent to start…</p>
        )}

        {entries.map((entry, i) => {
          const failed = entry.exitCode !== null && entry.exitCode !== 0;
          return (
            <div key={i} className="mb-2">
              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0">$</span>
                <span className={failed ? "text-red-400" : "text-gray-100"}>
                  {entry.command}
                </span>
                {entry.taskIndex > 0 && (
                  <span className="ml-auto shrink-0 text-[10px] text-gray-600 uppercase tracking-widest">
                    task {entry.taskIndex}
                  </span>
                )}
              </div>
              {entry.output && (
                <pre className="mt-0.5 pl-4 whitespace-pre-wrap break-words text-gray-400">
                  {entry.output}
                </pre>
              )}
              {failed && (
                <p className="pl-4 text-[10px] uppercase tracking-widest text-red-400">
                  exit {entry.exitCode}
                </p>
              )}
            </div>
          );
        })}

        {showPending && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0">$</span>
            <span className="text-gray-100">{lastCommand}</span>
            <span className="ml-1 inline-block w-2 h-3.5 bg-gray-100 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
