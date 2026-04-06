"use client";

import type { AgentUiState } from "@/hooks/useSwarm";
import { motion } from "framer-motion";
import { LiveBrowserView } from "@/components/LiveBrowserView";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  agent: AgentUiState;
};

export function AgentCard({ agent }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!agent.liveUrl && !agent.finalFrameSrc) setExpanded(false);
  }, [agent.liveUrl, agent.finalFrameSrc]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const border =
    agent.phase === "failed"
      ? "border-zinc-200 ring-1 ring-zinc-200/80"
      : agent.phase === "complete"
        ? "border-zinc-400 ring-1 ring-zinc-300/50"
        : "border-zinc-200 ring-1 ring-zinc-900/[0.06]";

  const failedMuted =
    agent.phase === "failed" ? "bg-zinc-50/80 opacity-[0.88] saturate-[0.4]" : "";

  const canExpandPreview = Boolean(agent.liveUrl || agent.finalFrameSrc);

  const expandedLayer =
    mounted &&
    expanded &&
    canExpandPreview &&
    createPortal(
      <div
        className="fixed inset-0 z-[300] flex flex-col p-3 sm:p-5"
        style={{ height: "100dvh", maxHeight: "100dvh" }}
      >
        <button
          type="button"
          className="absolute inset-0 bg-white/92 backdrop-blur-sm"
          aria-label="Close expanded view"
          onClick={() => setExpanded(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Expanded live view: ${agent.siteName}`}
          className="relative z-10 mx-auto flex w-full max-w-[1680px] flex-1 flex-col overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-2xl"
          style={{
            height: "calc(100dvh - 24px)",
            maxHeight: "calc(100dvh - 24px)",
            minHeight: 320,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <p className="truncate font-sans text-sm text-zinc-950">
              Agent {agent.index + 1} — {agent.siteName}
            </p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 font-sans text-xs text-zinc-950 transition hover:bg-zinc-100"
            >
              Close
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-zinc-100 p-2 sm:p-3">
            <LiveBrowserView
              frameKey={`expanded-${agent.index}`}
              liveUrl={agent.liveUrl}
              title={`Expanded live view ${agent.siteName}`}
              phase={agent.phase}
              finalFrameSrc={agent.finalFrameSrc}
              lastPageUrl={agent.lastPageUrl}
              variant="expanded"
            />
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <motion.article
      layout={false}
      className={`relative flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm ${border} ${failedMuted}`}
    >
      {expandedLayer}
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StatusIndicator phase={agent.phase} />
          <h3 className="truncate font-sans text-sm font-normal tracking-tight text-zinc-950">
            Agent {agent.index + 1} — {agent.siteName}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          disabled={!canExpandPreview}
          title="Expand live view"
          aria-label="Expand live view"
          className="shrink-0 rounded-md border border-zinc-300 p-2 text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Maximize2 className="size-4" aria-hidden />
        </button>
      </header>
      {!expanded ? (
        <LiveBrowserView
          frameKey={`agent-${agent.index}`}
          liveUrl={agent.liveUrl}
          title={`Live view ${agent.siteName}`}
          phase={agent.phase}
          finalFrameSrc={agent.finalFrameSrc}
          lastPageUrl={agent.lastPageUrl}
        />
      ) : (
        <div
          className="flex min-h-[280px] w-full items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 text-center text-xs text-zinc-500"
          aria-hidden
        >
          Preview open in expanded window
        </div>
      )}
      <p className="line-clamp-2 font-sans text-xs leading-relaxed text-zinc-600">
        {agent.statusText}
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200">
        <motion.div
          className={`h-full rounded-full ${agent.phase === "failed" ? "bg-zinc-400" : "bg-zinc-950"}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, agent.progress))}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
    </motion.article>
  );
}
