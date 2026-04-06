"use client";

import type { AgentPhase } from "@/hooks/useSwarm";
import { Check, Circle, Loader2, MinusCircle } from "lucide-react";

type Props = { phase: AgentPhase };

export function StatusIndicator({ phase }: Props) {
  if (phase === "complete") {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-700">
        <Check className="size-3.5 shrink-0" aria-hidden />
        <span className="sr-only">Complete</span>
      </span>
    );
  }
  if (phase === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-zinc-400">
        <MinusCircle className="size-3.5 shrink-0" aria-hidden />
        <span className="sr-only">No result</span>
      </span>
    );
  }
  if (phase === "extracting") {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-600">
        <Circle className="size-2.5 shrink-0 fill-amber-500 text-amber-600" aria-hidden />
        <span className="sr-only">Extracting</span>
      </span>
    );
  }
  if (phase === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-35" />
          <Circle className="relative size-2.5 fill-emerald-600 text-emerald-600" aria-hidden />
        </span>
        <span className="sr-only">Active</span>
      </span>
    );
  }
  if (phase === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-zinc-400">
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        <span className="sr-only">Pending</span>
      </span>
    );
  }
  return null;
}
