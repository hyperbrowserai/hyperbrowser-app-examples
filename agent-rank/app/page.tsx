"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, Key } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { UrlInput } from "@/components/url-input";
import { AgentGrid } from "@/components/agent-grid";
import { ScoreCard } from "@/components/score-card";
import type { Scan } from "@/lib/types";

export default function Home() {
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const reset = () => {
    stopPolling();
    setScan(null);
    setLoading(false);
    setError("");
  };

  const startScan = async (url: string, task: string) => {
    setLoading(true);
    setError("");
    setScan(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, task }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Scan failed to start");
      }
      const data = (await res.json()) as { scanId: string };

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/scan/${data.scanId}`);
          if (!r.ok) return;
          const s = (await r.json()) as Scan;
          setScan(s);
          if (s.status === "complete" || s.status === "error") {
            stopPolling();
            setLoading(false);
            if (s.status === "error") setError(s.error || "Scan failed");
          }
        } catch {
          // ignore single poll failure
        }
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setLoading(false);
    }
  };

  const showResults = scan?.status === "complete" && scan.scorecard;
  const showGrid = scan && !showResults;

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
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-3 text-center leading-[1]">
            AGENT
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-black">
              RANK
            </span>
          </h1>
          <p className="text-lg md:text-xl font-medium text-gray-500 max-w-2xl text-center leading-snug">
            Is your website{" "}
            <span className="text-black font-bold bg-gray-200 px-1">
              ready for AI agents?
            </span>
          </p>

          <div className="mt-5 text-xs font-bold uppercase tracking-widest text-gray-400">
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

        <AnimatePresence mode="wait">
          {!scan && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="mb-12"
            >
              <UrlInput loading={loading} onSubmit={startScan} />
            </motion.section>
          )}
        </AnimatePresence>

        {error && (
          <div className="max-w-3xl mx-auto mb-10 border-4 border-black bg-white p-5 shadow-brutal flex items-start gap-3">
            <AlertOctagon size={20} strokeWidth={2.5} className="text-black mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-black">Scan failed</p>
              <p className="text-sm text-gray-700 mt-1 break-words">{error}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1 border-2 border-black bg-white text-xs uppercase font-bold tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {showGrid && (
            <motion.section
              key="grid"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-12"
            >
              <div className="flex items-center justify-between max-w-6xl mx-auto mb-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Scanning
                  </p>
                  <p className="text-sm font-bold text-black truncate max-w-xl">
                    {scan!.url}
                  </p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-2 border-black px-3 py-1 bg-white">
                  {scan!.status === "judging"
                    ? "Judging results"
                    : "Agents running"}
                </p>
              </div>
              <AgentGrid scan={scan!} />
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showResults && (
            <motion.section
              key="card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ScoreCard scan={scan!} onReset={reset} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
