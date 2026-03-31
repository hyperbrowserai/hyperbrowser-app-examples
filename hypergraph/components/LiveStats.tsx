"use client";

interface LiveStatsProps {
  topic: string;
  nodeCount: number;
  linkCount: number;
  maxDepth: number;
  expansionCount: number;
}

export default function LiveStats({
  topic,
  nodeCount,
  linkCount,
  maxDepth,
  expansionCount,
}: LiveStatsProps) {
  const label = topic.length > 42 ? `${topic.slice(0, 40)}…` : topic;
  return (
    <div className="pointer-events-none absolute left-4 top-3 z-10 rounded-md border border-zinc-200/80 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
      <p className="accent text-[10px] font-semibold tracking-wide text-zinc-500">
        <span className="text-zinc-900">{label}</span>
        <span className="mx-1.5 text-zinc-300">·</span>
        {nodeCount} nodes
        <span className="mx-1.5 text-zinc-300">·</span>
        {linkCount} links
        <span className="mx-1.5 text-zinc-300">·</span>
        depth {maxDepth}
        <span className="mx-1.5 text-zinc-300">·</span>
        {expansionCount} expansions
      </p>
    </div>
  );
}
