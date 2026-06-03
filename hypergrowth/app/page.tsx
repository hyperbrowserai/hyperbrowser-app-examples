"use client";

import type { ComponentType, FormEvent } from "react";
import { useState } from "react";
import {
  Bot,
  Leaf,
  Loader2,
  Minus,
  Plus,
  Radar,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { SourceSelector } from "@/components/SourceSelector";
import { buildDemoResult } from "@/lib/demo-data";
import type { AnalysisMode, MineResult, SignalSource } from "@/lib/types";

const analysisModes: Array<{
  id: AnalysisMode;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: "deterministic", label: "Deterministic", icon: ShieldCheck },
  { id: "lean", label: "Lean", icon: Leaf },
  { id: "balanced", label: "Balanced", icon: Scale },
  { id: "full", label: "Full", icon: Sparkles },
];

const maxResultOptions = [3, 6, 12, 24, 30] as const;

const defaultRedditTargets =
  "webscraping, playwright, puppeteer, automation, webdev";

export default function Home() {
  const [query, setQuery] = useState(
    "Playwright Cloudflare browser automation fails in production"
  );
  const [sources, setSources] = useState<SignalSource[]>([
    "hackernews",
    "github",
    "hyperbrowser",
  ]);
  const [includeBroadWeb, setIncludeBroadWeb] = useState(true);
  const [redditTargets, setRedditTargets] = useState(defaultRedditTargets);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("balanced");
  const [maxResults, setMaxResults] = useState(6);
  const [result, setResult] = useState<MineResult>(() =>
    buildDemoResult(
      "Playwright Cloudflare browser automation fails in production",
      "balanced"
    )
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const subredditValidation = validateSubreddits(redditTargets);
  const canSubmit = !isLoading && subredditValidation.invalid.length === 0;

  function cycleMaxResults(direction: 1 | -1) {
    const currentIndex = maxResultOptions.indexOf(
      maxResults as (typeof maxResultOptions)[number]
    );
    const nextIndex = Math.max(
      0,
      Math.min(maxResultOptions.length - 1, currentIndex + direction)
    );
    setMaxResults(maxResultOptions[nextIndex]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          sources,
          maxResults,
          analysisMode,
          openWebTargets: {
            includeBroadWeb,
            redditSubreddits: subredditValidation.valid,
          },
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to mine growth signals.");
      }

      setResult(payload);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to mine growth signals."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <main className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-col gap-3 px-3 py-3 sm:px-4 lg:px-6">
        {/* Command Bar */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-panel/80 shadow-[0_16px_64px_rgba(0,0,0,0.32)] backdrop-blur-xl"
        >
          {/* Row 1: Branding, query, and sources */}
          <div className="flex flex-col gap-3 border-b border-line/60 px-4 py-3 lg:flex-row lg:items-center">
            {/* Branding */}
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg border border-accent/40 bg-accent/12 text-accent shadow-[0_0_24px_rgba(124,255,178,0.15)]">
                <Radar size={18} />
              </span>
              <div>
                <h1 className="text-base font-black tracking-tight">
                  HyperGrowth
                </h1>
                <p className="text-[11px] leading-none text-muted">
                  Developer Growth Intelligence
                </p>
              </div>
            </div>

            <div className="mx-2 hidden h-8 w-px bg-line/60 lg:block" />

            {/* Query */}
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
                Query
              </span>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-9 w-full rounded-md border border-line bg-black/30 pl-8 pr-3 text-[13px] text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent/60 focus:bg-black/40"
                  placeholder="e.g. browser automation blocked by captchas"
                />
              </div>
            </label>

            <div className="mx-1 hidden h-8 w-px bg-line/60 lg:block" />

            {/* Sources */}
            <div className="shrink-0">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
                Sources
              </span>
              <SourceSelector value={sources} onChange={setSources} />
            </div>
          </div>

          {/* Row 2: Hyperbrowser targets, analysis mode, max results, submit */}
          <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-end">
            {/* Subreddits are targets for Hyperbrowser open-web search */}
            {sources.includes("hyperbrowser") ? (
              <div className="flex min-w-0 flex-1 items-end gap-3">
                <label className="block min-w-0 flex-1">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Subreddits
                  </span>
                  <input
                    value={redditTargets}
                    onChange={(event) => setRedditTargets(event.target.value)}
                    className="h-9 w-full rounded-md border border-line bg-black/30 px-3 text-[13px] text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent/60"
                    placeholder="webscraping, playwright, automation"
                  />
                </label>

                <label className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-line bg-black/20 px-3 text-[11px] font-semibold text-muted transition hover:border-accent/30">
                  <input
                    type="checkbox"
                    checked={includeBroadWeb}
                    onChange={(event) =>
                      setIncludeBroadWeb(event.target.checked)
                    }
                    className="size-3.5 accent-[var(--accent)]"
                  />
                  Broad web
                </label>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            <div className="mx-1 hidden h-8 w-px bg-line/60 lg:block" />

            {/* Analysis Mode */}
            <div className="shrink-0">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
                Analysis Mode
              </span>
              <div className="flex h-9 overflow-hidden rounded-md border border-line">
                {analysisModes.map((mode) => {
                  const selected = analysisMode === mode.id;
                  const ModeIcon = mode.icon;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAnalysisMode(mode.id)}
                      className={`flex items-center gap-1 px-3 text-[12px] font-semibold transition ${
                        selected
                          ? "bg-accent/15 text-accent shadow-[inset_0_0_12px_rgba(124,255,178,0.08)]"
                          : "bg-black/20 text-muted hover:bg-white/[0.04] hover:text-foreground"
                      } ${mode.id !== "deterministic" ? "border-l border-line" : ""}`}
                    >
                      <ModeIcon size={12} />
                      <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mx-1 hidden h-8 w-px bg-line/60 lg:block" />

            {/* Max Results */}
            <div className="shrink-0">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
                Max Results
              </span>
              <div className="flex h-9 items-center rounded-md border border-line bg-black/20">
                <button
                  type="button"
                  onClick={() => cycleMaxResults(-1)}
                  className="grid size-9 place-items-center text-muted transition hover:text-foreground"
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-bold text-foreground">
                  {maxResults}
                </span>
                <button
                  type="button"
                  onClick={() => cycleMaxResults(1)}
                  className="grid size-9 place-items-center text-muted transition hover:text-foreground"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="mx-1 hidden h-8 w-px bg-line/60 lg:block" />

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-accent/50 bg-accent px-5 text-[13px] font-black text-background shadow-[0_0_24px_rgba(124,255,178,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <Bot size={15} />
              )}
              {isLoading ? "Analyzing..." : "Run Analysis"}
            </button>
          </div>

          {sources.includes("hyperbrowser") &&
          (subredditValidation.valid.length > 0 ||
            subredditValidation.invalid.length > 0) ? (
            <div className="flex flex-wrap gap-1.5 border-t border-line/50 px-4 py-2">
              {subredditValidation.valid.map((subreddit) => (
                <span
                  key={subreddit}
                  className="rounded-full border border-source-web/25 bg-source-web/10 px-2 py-0.5 text-[10px] font-semibold text-source-web"
                >
                  r/{subreddit}
                </span>
              ))}
              {subredditValidation.invalid.map((subreddit) => (
                <span
                  key={subreddit}
                  className="rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger"
                >
                  invalid: {subreddit}
                </span>
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="border-t border-danger/20 px-4 py-2">
              <p className="text-[12px] text-danger">{error}</p>
            </div>
          ) : null}
        </form>

        {/* Results */}
        <ResultsDashboard
          result={result}
          isLoading={isLoading}
          activeRun={{
            query,
            sources,
            analysisMode,
            maxResults,
            includeBroadWeb,
            redditTargets: subredditValidation.valid,
          }}
        />
      </main>
    </div>
  );
}

function parseSubreddits(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().replace(/^r\//i, ""))
        .filter(Boolean)
    )
  ).slice(0, 8);
}

function validateSubreddits(value: string): {
  valid: string[];
  invalid: string[];
} {
  const entries = parseSubreddits(value);
  return entries.reduce(
    (acc, subreddit) => {
      if (/^[A-Za-z0-9_]{2,24}$/.test(subreddit)) {
        acc.valid.push(subreddit);
      } else {
        acc.invalid.push(subreddit);
      }

      return acc;
    },
    { valid: [] as string[], invalid: [] as string[] }
  );
}
