"use client";

import { Globe } from "lucide-react";
import { Panel } from "./panel";
import type { BrowserCapture } from "@/hooks/use-run";

export function BrowserPanel({ captures }: { captures: BrowserCapture[] }) {
  const latest = captures[captures.length - 1];

  return (
    <Panel
      title="Browser"
      icon={Globe}
      active={captures.length > 0}
      badge={captures.length ? `${captures.length} fetched` : undefined}
      className="h-full"
    >
      {latest ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="border-b border-[#242424] px-4 py-2">
            <a
              href={latest.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate font-mono-code text-[11px] text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              {latest.url}
            </a>
            {latest.instruction && (
              <p className="mt-1 font-mono-code text-[11px] text-muted/70">
                {latest.instruction}
              </p>
            )}
          </div>
          {latest.screenshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                latest.screenshot.startsWith("http") || latest.screenshot.startsWith("data:")
                  ? latest.screenshot
                  : `data:image/png;base64,${latest.screenshot}`
              }
              alt={`Screenshot of ${latest.url}`}
              className="w-full"
            />
          ) : (
            <pre className="whitespace-pre-wrap break-words px-4 py-3 font-mono-code text-[12px] leading-relaxed text-[#d8d8d4]">
              {latest.text.slice(0, 4000) || "(no extracted content)"}
            </pre>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="font-mono-code text-xs text-muted/60">
            Live web pages the agent fetches appear here.
          </p>
        </div>
      )}
    </Panel>
  );
}
