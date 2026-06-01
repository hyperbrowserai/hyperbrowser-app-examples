"use client";

import { FormEvent, useState } from "react";
import { Loader2, Radar, Search, Sparkles } from "lucide-react";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { SourceSelector } from "@/components/SourceSelector";
import { buildDemoResult } from "@/lib/demo-data";
import type { MineResult, SignalSource } from "@/lib/types";

export default function Home() {
  const [query, setQuery] = useState("Playwright captcha failures");
  const [sources, setSources] = useState<SignalSource[]>([
    "hackernews",
    "github",
    "reddit",
  ]);
  const [maxResults, setMaxResults] = useState(12);
  const [result, setResult] = useState<MineResult>(() =>
    buildDemoResult("Playwright captcha failures")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, sources, maxResults }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to mine growth signals.");
      }

      setResult(payload);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to mine growth signals."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 md:px-8 lg:px-10">
        <header className="flex flex-col justify-between gap-5 border-b border-line pb-6 md:flex-row md:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <span className="grid size-8 place-items-center rounded-lg bg-foreground text-accent">
                <Radar size={17} />
              </span>
              HyperGrowth
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
              Mine developer pain into growth plays.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted md:text-lg">
              Use Hyperbrowser to scan developer communities, cluster pain
              signals, and turn raw demand into content, outbound, community,
              and landing-page experiments.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-panel p-4 text-sm text-muted md:w-80">
            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <Sparkles size={16} />
              Foundation mode
            </div>
            API contracts, source adapters, demo fallback, and synthesis are in
            place. Visual polish comes next.
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-panel p-5 shadow-sm"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_180px_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-muted">
                Market or pain to mine
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 w-full rounded-lg border border-line bg-white px-4 text-sm outline-none transition focus:border-foreground"
                placeholder="browser automation blocked by captchas"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-muted">
                Max signals
              </span>
              <select
                value={maxResults}
                onChange={(event) => setMaxResults(Number(event.target.value))}
                className="h-12 w-full rounded-lg border border-line bg-white px-4 text-sm outline-none transition focus:border-foreground"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={18}>18</option>
                <option value={24}>24</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-auto"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Search size={17} />
              )}
              {isLoading ? "Mining" : "Mine signals"}
            </button>
          </div>

          <div className="mt-5">
            <span className="mb-2 block text-xs font-bold uppercase text-muted">
              Sources
            </span>
            <SourceSelector value={sources} onChange={setSources} />
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </form>

        <ResultsDashboard result={result} />
      </main>
    </div>
  );
}
