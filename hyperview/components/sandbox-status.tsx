"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Loader2, CheckCircle2, AlertOctagon } from "lucide-react";
import type { RunState } from "@/hooks/use-run";

function useCountUp(target: number | null) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null) return;
    let frame = 0;
    const duration = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

export function SandboxStatus({ state }: { state: RunState }) {
  const bootValue = useCountUp(state.bootMs);
  const running = state.status === "running" || state.status === "booting";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-[#242424] bg-[#141414] px-5 py-4"
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono-code text-[11px] uppercase tracking-widest text-muted">
          Sandbox booted in
        </span>
        <span className="font-display text-2xl font-extrabold tabular-nums tracking-tight">
          {state.bootMs != null ? `${bootValue}ms` : "—"}
        </span>
      </div>

      <div className="h-5 w-px bg-[#242424]" />

      <div className="flex items-center gap-2">
        {state.status === "done" ? (
          <CheckCircle2 size={15} className="text-foreground" strokeWidth={2} />
        ) : state.status === "error" ? (
          <AlertOctagon size={15} className="text-foreground" strokeWidth={2} />
        ) : (
          <Loader2 size={15} className="animate-spin text-foreground" strokeWidth={2} />
        )}
        <span className="font-mono-code text-xs uppercase tracking-widest text-muted">
          {state.status === "booting"
            ? "Booting"
            : state.status === "running"
              ? "Running"
              : state.status === "done"
                ? "Finished"
                : "Error"}
        </span>
        {running && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground" />
          </span>
        )}
      </div>

      <div className="h-5 w-px bg-[#242424]" />

      <div className="flex items-center gap-2">
        <Cpu size={15} className="text-muted" strokeWidth={2} />
        <span className="font-mono-code text-xs text-muted">
          {state.image ?? "node"}
        </span>
      </div>

      {state.sandboxId && (
        <span className="ml-auto font-mono-code text-[11px] text-muted/50">
          {state.sandboxId}
        </span>
      )}
    </motion.div>
  );
}
