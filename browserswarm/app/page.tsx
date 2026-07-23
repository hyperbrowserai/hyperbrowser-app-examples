"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, Key } from "lucide-react";
import { useEffect, useState } from "react";
import { InputPanel, type Preflight } from "@/components/input-panel";
import { MissionBar } from "@/components/mission-bar";
import { Wall } from "@/components/wall";
import { BrainMeter } from "@/components/brain-meter";
import { AnswerView } from "@/components/answer-view";
import { useSwarm } from "@/lib/use-swarm";

export default function Home() {
  const { state, start, reset } = useSwarm();
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    fetch("/api/preflight")
      .then((r) => r.json())
      .then((d: Preflight) => setPreflight(d))
      .catch(() => setPreflight(null));
  }, []);

  const handleStart = (q: string, seeds: string[]) => {
    setQuestion(q);
    start(q, seeds);
  };

  const idle = state.status === "idle";
  const showAnswer = state.status === "done" || state.phase === "answering";
  const isError = state.status === "error";

  if (idle) {
    return (
      <main className="min-h-screen bg-white text-black flex flex-col">
        <div className="absolute top-0 right-0 p-6 z-10">
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
        <div className="flex-1 grid place-items-center px-4 py-16">
          <InputPanel preflight={preflight} busy={false} onStart={handleStart} />
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black flex flex-col">
      <MissionBar state={state} question={question} onReset={reset} />

      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        {isError ? (
          <div className="max-w-2xl mx-auto mt-10 border-4 border-black bg-white p-6 shadow-brutal flex items-start gap-3">
            <AlertOctagon size={22} strokeWidth={2.5} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold">Swarm halted</p>
              <p className="text-sm text-gray-700 mt-1 break-words">{state.error}</p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 px-4 py-2 border-2 border-black bg-white text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
              >
                New run
              </button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {showAnswer ? (
              <motion.div key="answer" exit={{ opacity: 0 }}>
                <AnswerView state={state} />
              </motion.div>
            ) : (
              <motion.div key="wall" exit={{ opacity: 0, transition: { duration: 0.4 } }}>
                <Wall state={state} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <div className="sticky bottom-0 z-20">
        <BrainMeter state={state} />
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="px-6 pb-8 pt-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
        Built with{" "}
        <a
          href="https://hyperbrowser.ai"
          target="_blank"
          rel="noreferrer"
          className="text-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white transition-all px-1"
        >
          Hyperbrowser
        </a>{" "}
        · one shared context, answered by Kimi K3
      </p>
      <p className="mt-1 font-mono text-[10px] text-gray-400">
        K3 input ~$3/M tokens · a full ~700K-token run ≈ $2–3 input (est)
      </p>
    </footer>
  );
}
