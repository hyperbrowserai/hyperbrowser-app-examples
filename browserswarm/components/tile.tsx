"use client";

import { memo } from "react";
import { Check, X } from "lucide-react";
import type { ClientTile } from "@/lib/use-swarm";

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    const p = (u.pathname + u.search).replace(/\/$/, "");
    return p === "" ? "/" : p;
  } catch {
    return url;
  }
}

function TileBase({ tile }: { tile: ClientTile }) {
  const { status, host, title, error } = tile;

  const base =
    "relative flex flex-col justify-between h-full min-h-[76px] p-2.5 border-2 bg-white overflow-hidden transition-all duration-300";
  const byStatus: Record<ClientTile["status"], string> = {
    idle: "border-gray-200 opacity-45",
    active: "border-black shadow-brutal-sm animate-swarm-pulse opacity-100",
    done: "border-gray-300 opacity-35",
    failed: "border-gray-200 opacity-55",
  };

  return (
    <div className={`${base} ${byStatus[status]}`}>
      {/* activity sweep while scraping */}
      {status === "active" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] overflow-hidden">
          <div className="h-full w-1/4 bg-[var(--accent)] animate-scan-sweep" />
        </div>
      )}

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono text-[10px] font-medium truncate text-black">
            {host}
          </span>
          {status === "done" && (
            <Check size={12} strokeWidth={3} className="shrink-0 text-black" />
          )}
          {status === "failed" && (
            <X size={12} strokeWidth={3} className="shrink-0 text-gray-400" />
          )}
        </div>
        <p className="mt-1 text-[11px] font-semibold leading-tight line-clamp-2 text-black/90">
          {title || pathOf(tile.url)}
        </p>
      </div>

      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-gray-400">
        {status === "idle" && "queued"}
        {status === "active" && (
          <span className="text-black">reading…</span>
        )}
        {status === "done" && "in context"}
        {status === "failed" && (
          <span className="truncate block" title={error}>
            {error?.includes("budget") ? "budget full" : "failed"}
          </span>
        )}
      </div>
    </div>
  );
}

export const Tile = memo(TileBase);
