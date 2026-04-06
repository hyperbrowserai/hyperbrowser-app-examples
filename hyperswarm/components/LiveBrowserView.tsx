"use client";

import type { AgentPhase } from "@/hooks/useSwarm";

type Props = {
  liveUrl: string;
  title: string;
  /** Stable key for React reconciliation; avoid keying on liveUrl (token refresh remounts = white iframe). */
  frameKey: string;
  phase: AgentPhase;
  finalFrameSrc?: string;
  lastPageUrl?: string;
  /** Card grid preview vs expanded overlay */
  variant?: "card" | "expanded";
};

export function LiveBrowserView({
  liveUrl,
  title,
  frameKey,
  phase,
  finalFrameSrc,
  lastPageUrl,
  variant = "card",
}: Props) {
  const isTerminal = phase === "complete" || phase === "failed";
  const frameClass =
    variant === "expanded"
      ? "min-h-0 flex-1 w-full border-0"
      : "aspect-[16/10] min-h-[280px] w-full border-0";

  const cardPreviewBox =
    variant === "card"
      ? "relative aspect-[16/10] min-h-[280px] w-full overflow-hidden rounded-md border border-zinc-300 bg-zinc-950 shadow-inner"
      : "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-300 bg-zinc-950 shadow-inner";

  // Server sends this on completion; may arrive a tick before phase flips to complete.
  // object-cover fills the slot (object-contain + object-top left a large empty grey band below).
  if (finalFrameSrc) {
    if (variant === "expanded") {
      return (
        <div className={cardPreviewBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={finalFrameSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-contain bg-zinc-950"
          />
        </div>
      );
    }
    return (
      <div className={cardPreviewBox}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={finalFrameSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </div>
    );
  }

  if (isTerminal) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 text-center ${
          variant === "expanded" ? "min-h-[55dvh] flex-1" : "aspect-[16/10] min-h-[280px]"
        }`}
      >
        <p className="font-sans text-sm text-zinc-800">
          {phase === "failed"
            ? "Run ended without a saved preview."
            : "Agent done — live session closed."}
        </p>
        {lastPageUrl ? (
          <a
            href={lastPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-full truncate rounded-md border border-zinc-300 bg-white px-3 py-2 font-sans text-xs text-zinc-900 underline-offset-2 hover:bg-zinc-100"
          >
            Open last page
          </a>
        ) : null}
        {!lastPageUrl && liveUrl ? (
          <p className="font-sans text-xs text-zinc-500">
            Embedded live view often stops after the session ends; use results below for output.
          </p>
        ) : null}
        {!lastPageUrl && !liveUrl ? (
          <p className="font-sans text-xs text-zinc-500">No page URL recorded for this run.</p>
        ) : null}
      </div>
    );
  }

  if (!liveUrl) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-sm text-zinc-500 ${
          variant === "expanded" ? "min-h-[70vh]" : "min-h-[280px]"
        }`}
      >
        Waiting for live view
      </div>
    );
  }

  return (
    <div
      className={
        variant === "expanded"
          ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-300 bg-zinc-950 shadow-inner"
          : "relative w-full overflow-hidden rounded-md border border-zinc-300 bg-zinc-950 shadow-inner"
      }
    >
      <iframe
        key={frameKey}
        title={title}
        src={liveUrl}
        className={frameClass}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        loading="eager"
        allow="fullscreen"
      />
    </div>
  );
}
