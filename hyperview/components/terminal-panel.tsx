"use client";

import { useEffect, useRef } from "react";
import { SquareTerminal } from "lucide-react";
import { Panel } from "./panel";

export function TerminalPanel({ output }: { output: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [output]);

  const active = output.length > 0;

  return (
    <Panel title="Terminal" icon={SquareTerminal} active={active} className="h-full">
      <div
        ref={ref}
        className="min-h-0 flex-1 overflow-auto bg-[#0f0f0f] px-4 py-3"
      >
        {active ? (
          <pre className="whitespace-pre-wrap break-words font-mono-code text-[12.5px] leading-relaxed text-[#d8d8d4]">
            {output}
            <span className="ml-0.5 inline-block h-3.5 w-[7px] translate-y-0.5 animate-pulse bg-[#d8d8d4]" />
          </pre>
        ) : (
          <p className="font-mono-code text-xs text-muted/60">
            stdout / stderr will stream here as the agent runs commands…
          </p>
        )}
      </div>
    </Panel>
  );
}
