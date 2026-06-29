"use client";

import { useMemo, useState } from "react";
import { MODELS, MODEL_LABELS, type ModelId, type Site } from "@/lib/types";
import {
  asciiBar,
  bestModelFor,
  pct,
  rateTier,
  TIER_CLASS,
} from "@/lib/format";

type SortKey = "difficulty" | ModelId;
type SortDir = "asc" | "desc";

export default function Leaderboard({
  sites,
  selectedId,
  onSelect,
}: {
  sites: Site[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("difficulty");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const copy = [...sites];
    copy.sort((a, b) => {
      const av = sortKey === "difficulty" ? a.difficulty : a.results[sortKey].successRate;
      const bv = sortKey === "difficulty" ? b.difficulty : b.results[sortKey].successRate;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return copy;
  }, [sortKey, sortDir, sites]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "desc" ? " v" : " ^") : "";

  const toggleLabel =
    sortKey === "difficulty"
      ? `sort: ${sortDir === "desc" ? "hardest first" : "easiest first"}`
      : `sort: ${MODEL_LABELS[sortKey]} ${sortDir === "desc" ? "best first" : "worst first"}`;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 flex-wrap mt-16 mb-4">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.16em]">
          leaderboard &mdash; success rate by model
        </h2>
        <button
          onClick={() => toggleSort("difficulty")}
          className="font-mono text-[11px] font-bold uppercase tracking-wider border-2 border-black bg-white shadow-brutal-sm px-3 py-1.5 hover:bg-gray-100"
        >
          {toggleLabel}
        </button>
      </div>

      <div className="border-4 border-black shadow-brutal-lg bg-white overflow-x-auto">
        <table className="w-full border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-black text-white font-mono text-[11px] lowercase">
              <th className="text-left font-bold px-4 py-3.5">site</th>
              {MODELS.map((m) => (
                <th
                  key={m}
                  onClick={() => toggleSort(m)}
                  className="text-right font-bold px-4 py-3.5 cursor-pointer hover:bg-[#222] whitespace-nowrap"
                >
                  {MODEL_LABELS[m]}
                  <span className="text-gray-500">{arrow(m)}</span>
                </th>
              ))}
              <th
                onClick={() => toggleSort("difficulty")}
                className="text-left font-bold px-4 py-3.5 cursor-pointer hover:bg-[#222] whitespace-nowrap"
              >
                difficulty
                <span className="text-gray-500">{arrow("difficulty")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((site, i) => (
              <Row
                key={site.id}
                site={site}
                first={i === 0}
                selected={site.id === selectedId}
                open={expanded === site.id}
                onClick={() => {
                  onSelect(site.id);
                  setExpanded((cur) => (cur === site.id ? null : site.id));
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({
  site,
  first,
  selected,
  open,
  onClick,
}: {
  site: Site;
  first: boolean;
  selected: boolean;
  open: boolean;
  onClick: () => void;
}) {
  const best = bestModelFor(site);

  return (
    <>
      <tr
        onClick={onClick}
        className={`cursor-pointer align-top ${first ? "" : "border-t-[3px] border-black"} ${
          selected ? "bg-gray-100" : "hover:bg-gray-50"
        }`}
      >
        <td className="text-left px-4 py-3.5">
          <div className="flex items-center gap-2 text-base font-extrabold tracking-tight">
            <span
              className={`font-mono text-xs text-gray-400 inline-block transition-transform ${open ? "rotate-90" : ""}`}
            >
              &gt;
            </span>
            {site.label}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {site.obstacles.map((o) => (
              <span
                key={o}
                className="font-mono text-[10px] font-semibold lowercase border-[1.5px] border-black px-1.5 py-0.5"
              >
                {o}
              </span>
            ))}
          </div>
        </td>
        {MODELS.map((m) => {
          const r = site.results[m].successRate;
          return (
            <td key={m} className="text-right px-4 py-3.5">
              <span
                className={`font-mono text-[15px] tabular-nums ${TIER_CLASS[rateTier(r)]}`}
              >
                <span className={m === best ? "border-b-2 border-black pb-px" : ""}>
                  {pct(r)}
                </span>
              </span>
            </td>
          );
        })}
        <td className="text-left px-4 py-3.5 whitespace-nowrap">
          <span className="font-mono text-sm tracking-[1.5px]">
            {asciiBar(site.difficulty)}
          </span>{" "}
          <span className="font-mono text-sm font-bold">{site.difficulty}</span>
        </td>
      </tr>
      <tr className={open ? "" : "hidden"}>
        <td colSpan={2 + MODELS.length} className="bg-gray-100 px-4">
          <div className="py-4 font-mono text-[13px]">
            {MODELS.map((m, idx) => (
              <div
                key={m}
                className={`flex gap-3 py-1.5 ${idx === 0 ? "" : "border-t border-dashed border-black/25"}`}
              >
                <span className="min-w-[150px] font-bold lowercase">
                  {MODEL_LABELS[m]}
                </span>
                <span className="text-gray-500 lowercase">
                  {site.results[m].breaks}
                </span>
              </div>
            ))}
          </div>
        </td>
      </tr>
    </>
  );
}
