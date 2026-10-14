"use client";

import { Fragment, useMemo, useState } from "react";
import type { LoadedRun } from "@/lib/data";
import { headline, headlineSentence, summarizeSite } from "@/lib/summary";
import type { CensusRun, SiteResult, SiteSummary } from "@/lib/types";
import { ScanForm } from "./scan-form";
import { ToolCard } from "./tool-card";

type SortKey =
  | "site"
  | "status"
  | "toolCount"
  | "imperative"
  | "declarative"
  | "readOnlyHints"
  | "consequentialHints"
  | "frames"
  | "durationMs";

const COLUMNS: { key: SortKey; label: string; title?: string; numeric?: boolean }[] = [
  { key: "site", label: "Site" },
  { key: "status", label: "Status" },
  { key: "toolCount", label: "Tools", numeric: true },
  { key: "imperative", label: "Imperative", numeric: true, title: "Registered from JavaScript" },
  { key: "declarative", label: "Forms", numeric: true, title: "Declarative <form toolname> tools" },
  {
    key: "readOnlyHints",
    label: "readOnly hint",
    numeric: true,
    title: "Tools the page itself labels readOnly. A hint, not a guarantee.",
  },
  {
    key: "consequentialHints",
    label: "Consequential hint",
    numeric: true,
    title: "Tools the page labels consequential. A hint, not a guarantee.",
  },
  { key: "frames", label: "Frames", numeric: true, title: "Distinct tab/frame sources" },
  { key: "durationMs", label: "Time", numeric: true },
];

type Row = { site: SiteResult; summary: SiteSummary; label: string; adhoc: boolean };

function siteLabel(site: SiteResult): string {
  try {
    const u = new URL(site.url);
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return site.url;
  }
}

function statusText(s: SiteSummary): string {
  if (s.status === "timeout") return "timed out";
  if (s.status === "error") return "error";
  if (s.httpStatus && s.httpStatus >= 400) return `HTTP ${s.httpStatus}`;
  return "checked";
}

export function Census({ loaded }: { loaded: LoadedRun | null }) {
  const [adhoc, setAdhoc] = useState<SiteResult[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("toolCount");
  const [desc, setDesc] = useState(true);
  const [onlyWithTools, setOnlyWithTools] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const run: CensusRun | null = loaded?.run ?? null;
  const h = run ? headline(run) : null;

  const rows = useMemo(() => {
    const all: Row[] = [
      ...adhoc.map((site) => ({ site, summary: summarizeSite(site), label: siteLabel(site), adhoc: true })),
      ...(run?.sites ?? []).map((site) => ({
        site,
        summary: summarizeSite(site),
        label: siteLabel(site),
        adhoc: false,
      })),
    ];
    const q = query.trim().toLowerCase();
    const filtered = all.filter(
      (r) =>
        (!onlyWithTools || r.summary.toolCount > 0) &&
        (!q ||
          r.label.toLowerCase().includes(q) ||
          r.site.tools.some((t) => t.name.toLowerCase().includes(q)))
    );
    const dir = desc ? -1 : 1;
    return filtered.sort((a, b) => {
      let cmp: number;
      if (sortKey === "site") cmp = a.label.localeCompare(b.label);
      else if (sortKey === "status") cmp = statusText(a.summary).localeCompare(statusText(b.summary));
      else cmp = a.summary[sortKey] - b.summary[sortKey];
      if (cmp === 0) cmp = b.summary.toolCount - a.summary.toolCount || a.label.localeCompare(b.label);
      return cmp * dir;
    });
  }, [run, adhoc, query, onlyWithTools, sortKey, desc]);

  function sortBy(key: SortKey) {
    if (key === sortKey) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(key !== "site" && key !== "status");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <header>
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Built with Hyperbrowser · read-only
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">WebMCP Census</h1>
        <p className="mt-3 max-w-2xl text-neutral-700">
          Which websites declare tools for AI agents? Each site is opened in a Hyperbrowser cloud
          session with WebMCP enabled, and every tool it registers across tabs and frames is
          listed. Nothing is ever invoked.
        </p>
      </header>

      {run && h ? (
        <section className="mt-8 border-2 border-black bg-white p-5 shadow-brutal">
          <p className="text-xl font-extrabold sm:text-2xl">{headlineSentence(h)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Sites checked" value={h.checked} />
            <Stat label="Declare tools" value={h.withTools} />
            <Stat label="Tools found" value={h.totalTools} />
            <Stat label="Timed out / errored" value={h.failed} />
          </dl>
          <p className="mt-4 text-sm text-neutral-600">
            WebMCP is a proposed web standard behind an origin trial, so most sites declaring zero
            tools is the expected result today, not a failure of the site.
          </p>
          <p className="mt-2 font-mono text-[11px] text-neutral-500">
            {loaded?.source === "fixture" ? "Showing fixtures/sample-results.json" : "Showing data/results.json"}
            {" · "}
            {run.mode} run · {new Date(run.generatedAt).toUTCString()} · concurrency{" "}
            {run.settings.concurrency} · {run.settings.timeoutMs / 1000}s per site
            {" · "}
            <a className="underline" href="/api/export/results.json">results.json</a>{" "}
            <a className="underline" href="/api/export/sites.csv">sites.csv</a>{" "}
            <a className="underline" href="/api/export/tools.csv">tools.csv</a>
          </p>
        </section>
      ) : (
        <section className="mt-8 border-2 border-black p-5">
          <p className="font-semibold">No results yet.</p>
          <p className="mt-1 text-sm text-neutral-600">
            Run <code className="font-mono">npm run census</code> (or{" "}
            <code className="font-mono">npm run census:mock</code> without an API key) and reload.
          </p>
        </section>
      )}

      <ScanForm onResult={(r) => { setAdhoc((prev) => [r, ...prev.filter((p) => p.url !== r.url)]); setOpen(`adhoc:${r.url}`); }} />

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-2xl font-extrabold">Leaderboard</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by site or tool name"
            className="w-64 border-2 border-black px-3 py-1.5 text-sm outline-none focus:shadow-brutal-sm"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={onlyWithTools}
              onChange={(e) => setOnlyWithTools(e.target.checked)}
              className="h-4 w-4 accent-black"
            />
            Only sites with tools
          </label>
        </div>

        <div className="mt-4 overflow-x-auto border-2 border-black shadow-brutal">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="bg-black text-white">
                <th className="w-10 px-3 py-2 text-left font-semibold">#</th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    title={c.title}
                    aria-sort={sortKey === c.key ? (desc ? "descending" : "ascending") : "none"}
                    className={`whitespace-nowrap px-3 py-2 font-semibold ${c.numeric ? "text-right" : "text-left"}`}
                  >
                    <button type="button" onClick={() => sortBy(c.key)} className="hover:underline">
                      {c.label}
                      {sortKey === c.key ? (desc ? " ↓" : " ↑") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-3 py-6 text-center text-neutral-500">
                    {onlyWithTools
                      ? "No checked site declared any WebMCP tools."
                      : "Nothing matches."}
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const id = `${r.adhoc ? "adhoc" : "run"}:${r.site.url}`;
                const isOpen = open === id;
                const s = r.summary;
                return (
                  <Fragment key={id}>
                    <tr
                      onClick={() => setOpen(isOpen ? null : id)}
                      className={`cursor-pointer border-t border-neutral-200 hover:bg-neutral-50 ${
                        s.toolCount > 0 ? "" : "text-neutral-500"
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{i + 1}</td>
                      <td className="max-w-[280px] px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold text-black" title={r.site.url}>
                            {r.label}
                          </span>
                          {r.adhoc && (
                            <span className="shrink-0 bg-black px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                              new
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill summary={s} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-black">
                        {s.toolCount}
                      </td>
                      <Num v={s.imperative} />
                      <Num v={s.declarative} />
                      <Num v={s.readOnlyHints} />
                      <Num v={s.consequentialHints} />
                      <Num v={s.frames} />
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {(s.durationMs / 1000).toFixed(1)}s
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-neutral-50">
                        <td colSpan={COLUMNS.length + 1} className="px-3 py-4">
                          <SiteDetail site={r.site} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-4 text-sm text-neutral-700 sm:grid-cols-2">
        <div className="border-2 border-black p-4">
          <p className="font-extrabold text-black">Annotations are hints, not permissions</p>
          <p className="mt-1">
            Names, descriptions, schemas, and annotations such as <code className="font-mono">readOnly</code>{" "}
            are written by the page. They are shown verbatim and unverified. A tool labelled
            read-only may still change things.
          </p>
        </div>
        <div className="border-2 border-black p-4">
          <p className="font-extrabold text-black">Declared, not guessed</p>
          <p className="mt-1">
            This only counts tools a site registers itself through WebMCP. It does not infer tools
            from page layout, and it does not bypass bot protection: blocked or slow sites are
            reported as such.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="font-mono text-3xl font-semibold">{value}</dd>
    </div>
  );
}

function Num({ v }: { v: number }) {
  return (
    <td className="px-3 py-2 text-right font-mono">{v === 0 ? <span className="text-neutral-300">0</span> : v}</td>
  );
}

function StatusPill({ summary }: { summary: SiteSummary }) {
  const text = statusText(summary);
  const tone =
    summary.status !== "ok"
      ? "border-red-700 bg-red-50 text-red-800"
      : summary.toolCount > 0
        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
        : "border-neutral-300 text-neutral-500";
  return (
    <span className={`inline-block whitespace-nowrap border px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {summary.toolCount > 0 ? "declares tools" : text}
    </span>
  );
}

function SiteDetail({ site }: { site: SiteResult }) {
  return (
    <div>
      <p className="font-mono text-xs text-neutral-600 break-all">
        {site.finalUrl && site.finalUrl !== site.url ? `${site.url} → ${site.finalUrl}` : site.url}
        {site.httpStatus ? ` · HTTP ${site.httpStatus}` : ""}
        {site.nativeSupported !== undefined ? ` · native WebMCP: ${site.nativeSupported ? "yes" : "no"}` : ""}
        {site.truncated ? " · discovery truncated" : ""}
      </p>
      {site.error && <p className="mt-1 font-mono text-xs text-red-700 break-all">{site.error}</p>}
      {site.tools.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600">
          {site.status === "ok"
            ? "This page declared no WebMCP tools. That is the norm for now: WebMCP is a proposed standard and very few sites have adopted it."
            : "The site could not be checked within the time budget, so its tools are unknown."}
        </p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {site.tools.map((t, i) => (
            <ToolCard key={`${t.tabId}:${t.frameUrl}:${t.name}:${i}`} tool={t} />
          ))}
        </div>
      )}
    </div>
  );
}
