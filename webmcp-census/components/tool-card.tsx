"use client";

import { useState } from "react";
import { schemaParams } from "@/lib/summary";
import type { ToolAnnotations, ToolRecord } from "@/lib/types";

const HINTS: { key: keyof ToolAnnotations; label: string; tone: string }[] = [
  { key: "readOnly", label: "readOnly", tone: "bg-emerald-100 border-emerald-700" },
  { key: "consequential", label: "consequential", tone: "bg-amber-100 border-amber-700" },
  { key: "destructive", label: "destructive", tone: "bg-red-100 border-red-700" },
  { key: "autosubmit", label: "autosubmit", tone: "bg-amber-100 border-amber-700" },
  { key: "untrustedContent", label: "untrustedContent", tone: "bg-neutral-100 border-neutral-600" },
  { key: "idempotent", label: "idempotent", tone: "bg-neutral-100 border-neutral-600" },
  { key: "openWorld", label: "openWorld", tone: "bg-neutral-100 border-neutral-600" },
];

export function ToolCard({ tool }: { tool: ToolRecord }) {
  const [showSchema, setShowSchema] = useState(false);
  const params = schemaParams(tool.inputSchema);
  const hints = HINTS.filter((h) => tool.annotations[h.key] === true);

  return (
    <div className="border-2 border-black bg-white p-4 shadow-brutal-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <code className="font-mono text-sm font-semibold break-all">{tool.name}</code>
        {tool.title && <span className="text-sm text-neutral-600">{tool.title}</span>}
        <span className="ml-auto flex gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
          <span className="border border-black px-1.5 py-0.5">
            {tool.declarative ? "declarative form" : "imperative"}
          </span>
          <span className="border border-black px-1.5 py-0.5">{tool.provider}</span>
        </span>
      </div>

      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Description (page-provided, unverified)
      </p>
      <p className="mt-0.5 line-clamp-4 text-sm whitespace-pre-wrap break-words">
        {tool.description || <span className="text-neutral-400">(empty)</span>}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Hints
        </span>
        {hints.length === 0 ? (
          <span className="text-xs text-neutral-400">none set</span>
        ) : (
          hints.map((h) => (
            <span key={h.key} className={`border px-1.5 py-0.5 font-mono text-[11px] ${h.tone}`}>
              {h.label}
            </span>
          ))
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Inputs
        </span>
        {params.length === 0 ? (
          <span className="text-xs text-neutral-400">none</span>
        ) : (
          params.map((p) => (
            <code key={p} className="bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px]">
              {p}
            </code>
          ))
        )}
        {tool.inputSchema && (
          <button
            type="button"
            onClick={() => setShowSchema((v) => !v)}
            className="ml-auto text-xs font-semibold underline underline-offset-2"
          >
            {showSchema ? "hide schema" : "raw schema"}
          </button>
        )}
      </div>

      {showSchema && (
        <pre className="mt-2 max-h-72 overflow-auto bg-neutral-950 p-3 font-mono text-[11px] text-neutral-100">
          {JSON.stringify(tool.inputSchema, null, 2)}
        </pre>
      )}

      <p className="mt-3 truncate font-mono text-[11px] text-neutral-500" title={tool.frameUrl}>
        {tool.isMainFrame ? "main frame" : "iframe"} · {tool.frameUrl}
      </p>
    </div>
  );
}
