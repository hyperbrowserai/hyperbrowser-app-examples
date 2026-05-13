"use client";

import { AlertOctagon, Key } from "lucide-react";
import { useAnalyze } from "@/hooks/use-analyze";
import { UrlInput } from "@/components/url-input";
import { ProgressSteps } from "@/components/progress-steps";
import { ScoreCircle } from "@/components/score-circle";
import { EngineCards } from "@/components/engine-cards";
import { CompetitorChart } from "@/components/competitor-chart";
import { PromptsLost } from "@/components/prompts-lost";
import { Citations } from "@/components/citations";
import { Inaccuracies } from "@/components/inaccuracies";
import { ShareButton } from "@/components/share-button";

export default function HomePage() {
  const {
    loading,
    step,
    stepLabel,
    engineProgress,
    scorecard,
    error,
    run,
    reset,
  } = useAnalyze();

  const companyMentionEstimate = scorecard
    ? estimateOwnMentions(scorecard)
    : 0;

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="absolute top-0 right-0 p-6">
        <a
          href="https://hyperbrowser.ai"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-2 bg-black text-white px-4 py-2 font-bold text-sm uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all shadow-brutal-sm hover:shadow-brutal hover:-translate-y-0.5"
        >
          <Key size={16} strokeWidth={2.5} />
          <span>Get API Key</span>
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-20">
        <header className="flex flex-col items-center mb-12 relative">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-center leading-[0.9]">
            HYPER
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-black">
              RANK
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-gray-500 max-w-2xl text-center leading-tight">
            Is your brand{" "}
            <span className="text-black font-bold bg-gray-200 px-1">
              AI-ready?
            </span>
          </p>

          <div className="mt-6 text-sm font-bold uppercase tracking-widest text-gray-400">
            Built with{" "}
            <a
              href="https://hyperbrowser.ai"
              target="_blank"
              rel="noreferrer"
              className="text-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white transition-all px-1"
            >
              Hyperbrowser
            </a>
          </div>
        </header>

        <section className="mb-10">
          <UrlInput loading={loading} onSubmit={run} />
        </section>

        {loading ? (
          <section className="mb-12">
            <ProgressSteps
              step={step}
              stepLabel={stepLabel}
              engineProgress={engineProgress}
            />
          </section>
        ) : null}

        {error ? (
          <section className="max-w-3xl mx-auto mb-12">
            <div className="border-4 border-red-500 bg-red-50 p-6 shadow-brutal flex items-start gap-3">
              <AlertOctagon
                size={20}
                strokeWidth={2.5}
                className="text-red-600 mt-0.5"
              />
              <div className="flex-1">
                <p className="font-bold text-red-700">Scan failed</p>
                <p className="text-sm text-red-700 mt-1 break-words">{error}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="px-3 py-1 border-2 border-black bg-white text-xs uppercase font-bold tracking-widest hover:bg-black hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </section>
        ) : null}

        {scorecard ? (
          <section className="flex flex-col gap-10">
            <div className="border-4 border-black bg-white p-8 shadow-brutal-lg flex flex-col md:flex-row items-center gap-8">
              <ScoreCircle score={scorecard.overallScore} />
              <div className="flex-1 text-center md:text-left">
                <div className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">
                  {scorecard.category}
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">
                  {scorecard.companyName}
                </h2>
                <p className="mt-3 text-base md:text-lg text-gray-700 font-medium leading-relaxed">
                  {scorecard.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 justify-center md:justify-start">
                  <ShareButton scorecard={scorecard} />
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-2 bg-white text-black px-5 py-3 font-bold text-sm uppercase tracking-widest border-4 border-black hover:bg-black hover:text-white transition-all shadow-brutal hover:shadow-brutal-sm"
                  >
                    Scan another
                  </button>
                </div>
              </div>
            </div>

            <EngineCards scores={scorecard.engineScores} />

            <CompetitorChart
              competitors={scorecard.competitorComparison}
              companyName={scorecard.companyName}
              companyMentions={companyMentionEstimate}
            />

            <PromptsLost items={scorecard.promptsLost} />

            <Citations sources={scorecard.citationSources} />
            <Inaccuracies items={scorecard.inaccuracies} />

            <footer className="text-center text-xs uppercase tracking-widest font-bold text-gray-400 pt-4">
              Scanned {new Date(scorecard.generatedAt).toLocaleString()} ·{" "}
              <a
                href={scorecard.inputUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-2 underline-offset-4 hover:text-black"
              >
                {scorecard.inputUrl}
              </a>
            </footer>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function estimateOwnMentions(scorecard: import("@/lib/types").Scorecard): number {
  const fromRate = (rate: string): number => {
    const match = rate.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return 0;
    return parseInt(match[1], 10);
  };
  const p = fromRate(scorecard.engineScores.perplexity.mentionRate);
  const g = fromRate(scorecard.engineScores.google.mentionRate);
  return p + g;
}
