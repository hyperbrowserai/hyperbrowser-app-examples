"use client";

import { useMemo, useState } from "react";
import { Play, Loader2, Check, AlertTriangle, Sparkles } from "lucide-react";
import { Wordmark } from "./wordmark";
import type { PreflightResult } from "@/lib/moonshot";

export interface Preflight {
  hyperbrowser: boolean;
  moonshot: PreflightResult;
  model: string;
  maxBrowsers: number;
  budgetTokens: number;
  hardLimit: number;
}

const EXAMPLE_Q =
  "Trace the history and evolution of web browsers and their engines — who built what, and when?";
const EXAMPLE_SEEDS = [
  "https://en.wikipedia.org/wiki/Web_browser",
  "https://en.wikipedia.org/wiki/History_of_the_web_browser",
  "https://en.wikipedia.org/wiki/Browser_engine",
  "https://en.wikipedia.org/wiki/Google_Chrome",
  "https://en.wikipedia.org/wiki/Mozilla_Firefox",
  "https://en.wikipedia.org/wiki/Safari_(web_browser)",
  "https://en.wikipedia.org/wiki/Microsoft_Edge",
  "https://en.wikipedia.org/wiki/Internet_Explorer",
  "https://en.wikipedia.org/wiki/Opera_(web_browser)",
  "https://en.wikipedia.org/wiki/Netscape_Navigator",
  "https://en.wikipedia.org/wiki/Chromium_(web_browser)",
  "https://en.wikipedia.org/wiki/WebKit",
  "https://en.wikipedia.org/wiki/Gecko_(software)",
  "https://en.wikipedia.org/wiki/Brave_(web_browser)",
].join("\n");

export function InputPanel({
  preflight,
  busy,
  onStart,
}: {
  preflight: Preflight | null;
  busy: boolean;
  onStart: (question: string, seeds: string[]) => void;
}) {
  const [question, setQuestion] = useState("");
  const [seedsText, setSeedsText] = useState("");

  const seeds = useMemo(
    () => seedsText.split("\n").map((s) => s.trim()).filter(Boolean),
    [seedsText]
  );

  const k3Ok = preflight?.moonshot.ok ?? false;
  const hbOk = preflight?.hyperbrowser ?? false;
  const keysMissing = preflight ? !hbOk || preflight.moonshot.ok === false : false;
  const hardBlock =
    preflight != null &&
    (!hbOk ||
      (preflight.moonshot.ok === false &&
        (preflight.moonshot.reason === "missing_key" || preflight.moonshot.reason === "auth")));

  const canStart = question.trim().length > 0 && seeds.length > 0 && !busy && !hardBlock;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <header className="flex flex-col items-center text-center mb-8">
        <Wordmark />
        <p className="mt-4 text-lg md:text-xl font-medium text-gray-500 max-w-2xl leading-snug">
          One{" "}
          <span className="text-black font-bold bg-gray-200 px-1">Kimi K3</span> brain.
          A swarm of{" "}
          <span className="text-black font-bold bg-gray-200 px-1">
            Hyperbrowser
          </span>{" "}
          browsers reading the web in parallel — every page streamed into a single
          shared context, answered in one prompt.
        </p>
      </header>

      {/* preflight status */}
      {preflight && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 font-mono text-[11px]">
          <StatusChip
            ok={hbOk}
            label={hbOk ? "Hyperbrowser key OK" : "HYPERBROWSER_API_KEY missing"}
          />
          <StatusChip
            ok={k3Ok}
            label={
              k3Ok
                ? `Kimi K3 OK (${preflight.model})`
                : `K3: ${preflight.moonshot.ok === false ? preflight.moonshot.reason : "error"}`
            }
            detail={preflight.moonshot.ok === false ? preflight.moonshot.detail : undefined}
          />
          <span className="inline-flex items-center border-2 border-black px-2 py-1 uppercase tracking-widest text-gray-600">
            {preflight.maxBrowsers} browsers max
          </span>
          <span className="inline-flex items-center border-2 border-black px-2 py-1 uppercase tracking-widest text-gray-600">
            {(preflight.budgetTokens / 1000).toFixed(0)}K ctx budget
          </span>
        </div>
      )}

      <div className="border-4 border-black bg-white shadow-brutal-lg p-5 sm:p-6">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
          Research question
        </label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What do you want the swarm to find out?"
          disabled={busy}
          className="w-full border-2 border-black px-3 py-2.5 text-sm font-medium outline-none focus:bg-gray-50 placeholder:text-gray-400"
        />

        <div className="flex items-center justify-between mt-5 mb-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Seed URLs — one per line
          </label>
          <span className="font-mono text-[11px] text-gray-400 tnum">
            {seeds.length} url{seeds.length === 1 ? "" : "s"}
          </span>
        </div>
        <textarea
          value={seedsText}
          onChange={(e) => setSeedsText(e.target.value)}
          placeholder={"https://example.com/page-1\nhttps://example.com/page-2\n…"}
          disabled={busy}
          rows={7}
          className="w-full border-2 border-black px-3 py-2.5 text-sm font-mono outline-none focus:bg-gray-50 placeholder:text-gray-400 resize-y"
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-5">
          <button
            type="button"
            onClick={() => onStart(question.trim(), seeds)}
            disabled={!canStart}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-black text-white px-5 py-3 font-bold text-sm uppercase tracking-widest border-2 border-black shadow-brutal enabled:hover:-translate-y-0.5 enabled:hover:shadow-brutal-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? (
              <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
            ) : (
              <Play size={16} strokeWidth={2.5} />
            )}
            Release the swarm
          </button>
          <button
            type="button"
            onClick={() => {
              setQuestion(EXAMPLE_Q);
              setSeedsText(EXAMPLE_SEEDS);
            }}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-black bg-white text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <Sparkles size={14} strokeWidth={2.5} />
            Load example
          </button>
        </div>

        {hardBlock && (
          <p className="mt-3 text-xs text-gray-600 flex items-start gap-1.5">
            <AlertTriangle size={13} strokeWidth={2.5} className="mt-0.5 shrink-0" />
            <span>
              Add the missing key(s) to <code className="font-mono">.env.local</code> and restart the dev server.
            </span>
          </p>
        )}
        {keysMissing && !hardBlock && (
          <p className="mt-3 text-xs text-gray-500">
            Heads up: K3 preflight reported an issue but you can still try a run.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusChip({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <span
      title={detail}
      className={`inline-flex items-center gap-1.5 border-2 px-2 py-1 uppercase tracking-widest ${
        ok ? "border-black text-black" : "border-gray-300 text-gray-500 bg-gray-50"
      }`}
    >
      {ok ? (
        <Check size={12} strokeWidth={3} />
      ) : (
        <AlertTriangle size={12} strokeWidth={3} />
      )}
      {label}
    </span>
  );
}
