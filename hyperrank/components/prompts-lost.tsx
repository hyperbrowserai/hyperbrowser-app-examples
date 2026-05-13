import { ArrowRight } from "lucide-react";
import type { PromptLost } from "@/lib/types";

export function PromptsLost({ items }: { items: PromptLost[] }) {
  return (
    <div className="border-4 border-black bg-white p-6 shadow-brutal">
      <h3 className="text-xl font-black uppercase tracking-tight mb-4">
        Prompts you&apos;re losing
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 font-medium">
          No competitor wins detected. You&apos;re showing up where it counts.
        </p>
      ) : (
        <ul className="divide-y-4 divide-black border-4 border-black">
          {items.map((p, i) => (
            <li key={i} className="p-4 bg-white">
              <p className="font-bold text-base leading-snug">
                &ldquo;{p.prompt}&rdquo;
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase font-bold tracking-widest text-gray-500">
                <span className="px-2 py-1 border-2 border-black bg-gray-100 text-black">
                  {p.engine}
                </span>
                <ArrowRight size={14} strokeWidth={3} />
                <span className="px-2 py-1 border-2 border-black bg-yellow-300 text-black">
                  {p.competitorMentioned}
                </span>
              </div>
              {p.reason ? (
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {p.reason}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
