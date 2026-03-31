"use client";

interface DepthIndicatorProps {
  maxDepth: number;
}

export default function DepthIndicator({ maxDepth }: DepthIndicatorProps) {
  return (
    <div className="pointer-events-none absolute right-4 top-3 z-10 rounded-md border border-zinc-200/80 bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-sm">
      <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-zinc-400">
        max depth
      </span>
      <span className="ml-2 font-mono text-[11px] font-bold text-zinc-800">{maxDepth}</span>
    </div>
  );
}
