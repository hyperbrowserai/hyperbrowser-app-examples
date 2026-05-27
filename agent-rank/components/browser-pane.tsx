"use client";

import { motion } from "framer-motion";
import { Check, CircleSlash, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentRuntimeResult, AgentStatus, SessionInfo } from "@/lib/types";

interface Props {
  label: string;
  session: SessionInfo;
  result?: AgentRuntimeResult;
  startedAt: number;
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: AgentStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white bg-black border-2 border-black px-2 py-0.5">
        <Check size={10} strokeWidth={3} />
        Completed
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-2 border-gray-300 px-2 py-0.5">
        <CircleSlash size={10} strokeWidth={2.5} />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-black border-2 border-black px-2 py-0.5 bg-yellow-300 animate-pulse">
      <Loader2 size={10} strokeWidth={2.5} className="animate-spin" />
      Running
    </span>
  );
}

export function BrowserPane({ label, session, result, startedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (result && result.status !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [result]);

  const status: AgentStatus = result?.status ?? "running";
  const endTime = result?.completedAt ?? now;
  const elapsed = formatElapsed(endTime - startedAt);
  const dim = status === "failed";

  return (
    <div
      className={`flex flex-col border-4 border-black bg-white shadow-brutal overflow-hidden transition-opacity ${
        dim ? "opacity-70" : "opacity-100"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b-4 border-black bg-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-black">
            {label}
          </span>
          <StatusBadge status={status} />
        </div>
        <span className="text-xs font-bold tabular-nums text-gray-600">
          {elapsed}
        </span>
      </div>

      <div className="relative aspect-[16/10] bg-gray-50">
        {session.liveViewUrl ? (
          <iframe
            src={session.liveViewUrl}
            sandbox="allow-same-origin allow-scripts"
            className="absolute inset-0 w-full h-full border-0"
            title={`${label} live view`}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-xs font-bold uppercase tracking-widest text-gray-400">
            No live view available
          </div>
        )}
        {status === "completed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-2 right-2 bg-black text-white p-1.5 border-2 border-black"
          >
            <Check size={12} strokeWidth={3} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
