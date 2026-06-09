"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FailureLog } from "@/components/failure-log";
import { FileViewer } from "@/components/file-viewer";
import { HarnessScore } from "@/components/harness-score";
import { ProgressTracker } from "@/components/progress-tracker";
import { ShareButton } from "@/components/share-button";
import { TerminalStream } from "@/components/terminal-stream";
import { TopIssues } from "@/components/top-issues";
import { UrlInput } from "@/components/url-input";
import type { Scan } from "@/lib/types";

export default function Home() {
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  async function start(repoUrl: string) {
    setError(null);
    setScan(null);
    setLoading(true);
    try {
      const res = await fetch("/api/harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start harness.");
        setLoading(false);
        return;
      }

      const scanId: string = data.scanId;
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/harness/${scanId}`);
          if (!r.ok) return;
          const s = (await r.json()) as Scan;
          setScan(s);
          if (s.status === "complete" || s.status === "error") {
            stopPolling();
            setLoading(false);
            if (s.status === "error") setError(s.error || "Harness run failed.");
          }
        } catch {
          // ignore single poll failure
        }
      }, 3000);
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  function reset() {
    stopPolling();
    setScan(null);
    setError(null);
    setLoading(false);
  }

  const running =
    loading && (!scan || (scan.status !== "complete" && scan.status !== "error"));
  const complete = scan?.status === "complete" && scan.results;

  return (
    <main className="min-h-screen bg-white px-4 sm:px-6 py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col items-center mb-12">
          <div className="mb-6 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-400 text-center">
            Built with{" "}
            <a
              href="https://hyperbrowser.ai"
              target="_blank"
              rel="noreferrer"
              className="text-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white transition-all px-1"
            >
              Hyperbrowser Sandboxes
            </a>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-center leading-[0.9]">
            HYPER
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-black">
              HARNESS
            </span>
          </h1>
          <p className="text-lg md:text-2xl font-medium text-gray-500 max-w-2xl text-center leading-tight">
            Your markdown is probably{" "}
            <span className="text-black font-bold bg-gray-200 px-1">
              lying to your AI agents.
            </span>
          </p>
          <p className="mt-4 text-sm md:text-base text-gray-500 max-w-xl text-center font-medium leading-snug">
            We run your agent in a sandbox, watch it fail, and rewrite your CLAUDE.md
            from what actually went wrong.
          </p>
        </header>

        <AnimatePresence mode="wait">
          {!scan && !running && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              <UrlInput loading={loading} onSubmit={start} />
              {error && (
                <p className="mt-6 text-center text-sm font-bold text-black border-2 border-black bg-yellow-300 px-4 py-3 max-w-3xl mx-auto">
                  {error}
                </p>
              )}
            </motion.section>
          )}

          {running && scan && (
            <motion.section
              key="progress"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              <TerminalStream entries={scan.terminal ?? []} lastCommand={scan.lastCommand} />
              <div className="mt-6">
                <ProgressTracker scan={scan} />
              </div>
            </motion.section>
          )}

          {complete && scan.results && (
            <motion.section
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-8"
            >
              <HarnessScore score={scan.results.score} />
              <TopIssues issues={scan.results.score.topIssues} />
              <FileViewer
                claudeMd={scan.results.claudeMd}
                agentsMd={scan.results.agentsMd}
              />
              <FailureLog failures={scan.results.failures} />

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-5 h-12 font-bold text-sm uppercase tracking-widest border-4 border-black bg-black text-white hover:bg-white hover:text-black transition-colors shadow-brutal hover:shadow-brutal-sm"
                >
                  <RotateCcw size={14} strokeWidth={2.5} /> Generate Another
                </button>
                <ShareButton scan={scan} />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {error && scan?.status === "error" && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 h-12 font-bold text-sm uppercase tracking-widest border-4 border-black bg-black text-white hover:bg-white hover:text-black transition-colors shadow-brutal"
            >
              <RotateCcw size={14} strokeWidth={2.5} /> Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
