"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { TweetInput } from "@/components/tweet-input";
import { LoadingState } from "@/components/loading-state";
import { ScoreCard } from "@/components/score-card";
import type { ScoreResult, StreamEvent } from "@/lib/types";

type Phase = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("Analyzing tweet...");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setInput("");
    setPhase("idle");
    setMessage("Analyzing tweet...");
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setPhase("loading");
    setError(null);
    setResult(null);
    setMessage("Analyzing tweet...");

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const payload = dataLine.slice(6).trim();
          if (!payload) continue;

          let event: StreamEvent;
          try {
            event = JSON.parse(payload) as StreamEvent;
          } catch {
            continue;
          }

          if ("error" in event) {
            setError(event.error);
            setPhase("error");
            return;
          }

          if ("message" in event) {
            setMessage(event.message);
          }

          if ("result" in event && event.result) {
            setResult(event.result);
            setPhase("done");
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setPhase("error");
    }
  };

  const showInput = phase === "idle" || phase === "loading" || phase === "error";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-12 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-[#fafafa] sm:text-4xl">
            PHOENIXSCORE
          </h1>
          <p className="mt-3 max-w-md font-mono text-[13px] leading-relaxed text-[#a3a3a3]">
            Score your tweet with the open-source X algorithm.
          </p>
          <p className="mt-2 font-mono text-[11px] text-[#525252]">
            Using documented weights from xai-org/x-algorithm (May 2026).
          </p>
        </div>
        <div className="shrink-0 border border-[#262626] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[#a3a3a3]">
          Built with Hyperbrowser
        </div>
      </header>

      <AnimatePresence mode="wait">
        {showInput ? (
          <motion.section
            key="input-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <TweetInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={phase === "loading"}
            />

            {phase === "loading" && <LoadingState message={message} />}

            {phase === "error" && error && (
              <div className="mt-6 border border-[#262626] bg-[#0f0f0f] px-4 py-3 font-mono text-[12px] leading-relaxed text-[#a3a3a3]">
                {error}
              </div>
            )}
          </motion.section>
        ) : (
          <motion.section
            key="result-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {result && <ScoreCard result={result} onReset={reset} />}
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="mt-16 font-mono text-[10px] text-[#404040]">
        Open source. Built with Hyperbrowser.
      </footer>
    </main>
  );
}
