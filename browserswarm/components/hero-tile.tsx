"use client";

import { Loader2, Radio, CircleSlash } from "lucide-react";
import type { ClientHero } from "@/lib/use-swarm";

export function HeroTile({ hero }: { hero: ClientHero }) {
  const { status, host, title, liveUrl } = hero;

  return (
    <div className="flex flex-col border-4 border-black bg-white shadow-brutal overflow-hidden h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b-4 border-black bg-white">
        <span className="font-mono text-[11px] font-semibold truncate text-black">
          {host}
        </span>
        {status === "live" && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-black border-2 border-black px-1.5 py-0.5 bg-[var(--accent)]">
            <Radio size={9} strokeWidth={3} className="animate-pulse" />
            Live
          </span>
        )}
        {status === "spawning" && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 border-2 border-gray-300 px-1.5 py-0.5">
            <Loader2 size={9} strokeWidth={3} className="animate-spin" />
            Spawning
          </span>
        )}
        {status === "failed" && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 border-2 border-gray-300 px-1.5 py-0.5">
            <CircleSlash size={9} strokeWidth={3} />
            No view
          </span>
        )}
      </div>

      <div className="relative flex-1 min-h-0 bg-gray-50">
        {liveUrl ? (
          <iframe
            src={liveUrl}
            sandbox="allow-same-origin allow-scripts"
            className="absolute inset-0 w-full h-full border-0"
            title={`${host} live view`}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center px-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              {status === "failed" ? "live view unavailable" : "connecting…"}
            </span>
          </div>
        )}
      </div>

      {title && (
        <div className="px-3 py-1.5 border-t-2 border-black/10 bg-white">
          <p className="text-[11px] font-semibold truncate text-black/80">{title}</p>
        </div>
      )}
    </div>
  );
}
