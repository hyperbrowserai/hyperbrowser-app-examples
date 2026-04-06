"use client";

import type { RankedResult } from "@/lib/types";
import { FileText, Globe } from "lucide-react";
import type { ReactNode } from "react";

type Props = { item: RankedResult };

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-zinc-500">
      {children}
    </p>
  );
}

export function ResultCard({ item }: Props) {
  const sources = item.sources.filter(Boolean);

  return (
    <article className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <header className="flex gap-3 border-b border-zinc-100 pb-4">
        <span
          className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 font-sans text-xs font-normal tabular-nums text-zinc-700"
          aria-label={`Rank ${item.rank}`}
        >
          {item.rank}
        </span>
        <h4 className="min-w-0 flex-1 font-sans text-[15px] font-normal leading-snug tracking-tight text-zinc-950">
          {item.title}
        </h4>
      </header>

      {item.keyData.trim() ? (
        <section className="mt-4">
          <SectionLabel>Key facts</SectionLabel>
          <p className="font-sans text-[13px] font-normal leading-relaxed text-zinc-600">
            {item.keyData}
          </p>
        </section>
      ) : null}

      <section className="mt-4">
        <SectionLabel>Sources</SectionLabel>
        {sources.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Sources">
            {sources.map((s) => (
              <li
                key={s}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50/80 px-2.5 py-1 font-sans text-[11px] font-normal text-zinc-700"
              >
                <Globe className="size-2.5 shrink-0 text-zinc-400" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-sans text-[12px] font-normal text-zinc-400">No sources listed</p>
        )}
      </section>

      {item.summary.trim() ? (
        <section className="mt-4 border-t border-zinc-100 pt-4">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="size-3 text-zinc-400" aria-hidden />
              Summary
            </span>
          </SectionLabel>
          <p className="font-sans text-[13px] font-normal leading-relaxed text-zinc-700">
            {item.summary}
          </p>
        </section>
      ) : null}
    </article>
  );
}
