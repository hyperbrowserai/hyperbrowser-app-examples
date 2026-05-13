import { AlertTriangle } from "lucide-react";

export function Inaccuracies({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border-4 border-red-500 bg-red-50 p-6 shadow-brutal">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} strokeWidth={2.5} className="text-red-600" />
        <h3 className="text-xl font-black uppercase tracking-tight text-red-700">
          Inaccuracies detected
        </h3>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((i, idx) => (
          <li
            key={idx}
            className="border-2 border-red-500 bg-white px-3 py-2 text-sm font-medium"
          >
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
