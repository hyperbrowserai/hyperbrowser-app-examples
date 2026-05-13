import type { CompetitorComparison } from "@/lib/types";

interface CompetitorChartProps {
  competitors: CompetitorComparison[];
  companyName: string;
  companyMentions: number;
}

export function CompetitorChart({
  competitors,
  companyName,
  companyMentions,
}: CompetitorChartProps) {
  const rows = [
    { name: companyName, mentionCount: companyMentions, isYou: true, isRecommendedOver: false },
    ...competitors.map((c) => ({ ...c, isYou: false })),
  ];
  const max = Math.max(1, ...rows.map((r) => r.mentionCount));

  return (
    <div className="border-4 border-black bg-white p-6 shadow-brutal">
      <h3 className="text-xl font-black uppercase tracking-tight mb-4">
        Competitor mentions
      </h3>
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const pct = Math.round((row.mentionCount / max) * 100);
          return (
            <div key={row.name} className="flex items-center gap-3">
              <div
                className={`w-44 truncate text-sm font-bold ${
                  row.isYou ? "uppercase tracking-widest" : ""
                }`}
              >
                {row.name}
                {row.isYou ? " (you)" : ""}
              </div>
              <div className="flex-1 h-8 border-2 border-black bg-gray-50 relative overflow-hidden">
                <div
                  className={`h-full ${row.isYou ? "bg-black" : "bg-yellow-300"}`}
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-xs font-bold font-mono">
                  {row.mentionCount}
                </span>
              </div>
              {!row.isYou && row.isRecommendedOver ? (
                <span className="px-2 py-1 border-2 border-black bg-red-300 text-[10px] uppercase font-bold tracking-widest">
                  Recommended over you
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
