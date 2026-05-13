interface ScoreCircleProps {
  score: number;
  label?: string;
}

function tier(score: number): { bg: string; border: string; label: string } {
  if (score >= 90) return { bg: "bg-lime-400", border: "border-black", label: "Dominant" };
  if (score >= 70) return { bg: "bg-green-400", border: "border-black", label: "Strong" };
  if (score >= 50) return { bg: "bg-yellow-300", border: "border-black", label: "Mixed" };
  if (score >= 30) return { bg: "bg-orange-400", border: "border-black", label: "Weak" };
  return { bg: "bg-red-400", border: "border-black", label: "Invisible" };
}

export function ScoreCircle({ score, label }: ScoreCircleProps) {
  const t = tier(score);
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-44 h-44 md:w-56 md:h-56 border-4 ${t.border} ${t.bg} shadow-brutal-lg flex flex-col items-center justify-center`}
      >
        <div className="text-6xl md:text-7xl font-black tracking-tighter leading-none">
          {Math.round(score)}
        </div>
        <div className="mt-1 text-xs uppercase font-bold tracking-widest">
          / 100
        </div>
      </div>
      <div className="mt-4 px-3 py-1 border-2 border-black bg-white text-xs uppercase tracking-widest font-bold">
        {label ?? t.label}
      </div>
    </div>
  );
}
