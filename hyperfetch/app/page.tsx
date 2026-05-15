"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeroInput } from "@/components/hero-input";
import { ProgressSteps } from "@/components/progress-steps";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ResultContainer } from "@/components/result-container";
import { SummaryCard } from "@/components/summary-card";
import { FactsCard } from "@/components/facts-card";
import { StatsCard } from "@/components/stats-card";
import { TablesCard } from "@/components/tables-card";
import { CodeCard } from "@/components/code-card";
import { EntitiesCard } from "@/components/entities-card";
import { LinksCard } from "@/components/links-card";
import type { EnrichedResult, StreamEvent } from "@/lib/types";

type Phase = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<EnrichedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(url: string) {
    setPhase("loading");
    setStep(1);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const json = line.slice(6);
          let event: StreamEvent;
          try {
            event = JSON.parse(json) as StreamEvent;
          } catch {
            continue;
          }

          if (event.step === -1) {
            setPhase("error");
            setError(event.error || event.message);
            return;
          }

          setStep(event.step);
          if (event.step === 4 && event.result) {
            setResult(event.result);
            setPhase("done");
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setPhase("error");
      setError(message);
    }
  }

  function reset() {
    setPhase("idle");
    setStep(0);
    setResult(null);
    setError(null);
  }

  return (
    <main className="min-h-screen px-5 sm:px-8 pb-32">
      <header className="max-w-5xl mx-auto pt-8 sm:pt-10 flex items-start justify-between gap-4">
        <button
          onClick={reset}
          className="text-left group"
          type="button"
          aria-label="Home"
        >
          <div className="text-[15px] font-semibold tracking-[0.18em] uppercase">
            Hyperfetch
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            Enriched web data for AI agents
          </div>
        </button>
        <a
          href="https://hyperbrowser.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center text-[11px] font-mono uppercase tracking-[0.16em] px-2.5 py-1.5 border border-border text-neutral-700 hover:border-foreground hover:text-foreground transition-colors"
        >
          Built with Hyperbrowser
        </a>
      </header>

      <motion.section
        layout
        transition={{ type: "spring", stiffness: 220, damping: 30 }}
        className={
          phase === "idle"
            ? "max-w-5xl mx-auto pt-32 sm:pt-40 pb-20"
            : "max-w-5xl mx-auto pt-12 sm:pt-16 pb-10"
        }
      >
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle-hero"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="text-center mb-10"
            >
              <h1 className="text-4xl sm:text-[56px] leading-[1.05] font-semibold tracking-tight">
                Enriched web data,
                <br />
                <span className="text-neutral-400">ready for any agent.</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-neutral-500 max-w-xl mx-auto">
                Paste a URL. Get a structured, citable dataset. No hallucinations.
                No noise.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <HeroInput onSubmit={handleAnalyze} disabled={phase === "loading"} compact={phase !== "idle"} />
      </motion.section>

      <section className="max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              <ProgressSteps current={step} />
              <LoadingSkeleton />
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto border border-border bg-surface p-8 text-center"
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-neutral-500 mb-2">
                Error
              </div>
              <p className="text-base text-neutral-800">{error}</p>
              <button
                onClick={reset}
                type="button"
                className="mt-5 inline-flex items-center px-4 py-2 bg-foreground text-background text-sm font-medium"
              >
                Try again
              </button>
            </motion.div>
          )}

          {phase === "done" && result && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ResultContainer>
                <SummaryCard data={result} />
                <StatsCard stats={result.stats} />
                <FactsCard facts={result.keyFacts} />
                <TablesCard tables={result.tables} />
                <CodeCard codeBlocks={result.codeBlocks} />
                <EntitiesCard entities={result.entities} />
                <LinksCard links={result.links} />
              </ResultContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
