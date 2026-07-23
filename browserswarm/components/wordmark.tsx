import { Boxes } from "lucide-react";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="grid place-items-center h-7 w-7 bg-black text-white border-2 border-black">
          <Boxes size={16} strokeWidth={2.5} />
        </span>
        <span className="text-lg font-bold tracking-tight leading-none">
          BROWSER<span className="text-gray-400">SWARM</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-11 w-11 bg-black text-white border-2 border-black shadow-brutal-sm">
          <Boxes size={26} strokeWidth={2.5} />
        </span>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1]">
          BROWSER
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-400 to-black">
            SWARM
          </span>
        </h1>
      </div>
    </div>
  );
}
