"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, Boxes, RotateCcw } from "lucide-react";
import { useRun } from "@/hooks/use-run";
import { TaskInput } from "@/components/task-input";
import { Workspace } from "@/components/workspace";
import { ShareButton } from "@/components/share-button";

export default function HomePage() {
  const { state, run, reset } = useRun();

  const started = state.status !== "idle";
  const loading = state.status === "booting" || state.status === "running";
  const elapsedSeconds =
    state.startedAt && state.finishedAt
      ? Math.max(1, Math.round((state.finishedAt - state.startedAt) / 1000))
      : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top-right badge */}
      <div className="pointer-events-none fixed right-0 top-0 z-10 p-5 sm:p-6">
        <a
          href="https://hyperbrowser.ai"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#242424] bg-[#141414] px-3.5 py-2 font-mono-code text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-[#3a3a3a] hover:text-foreground"
        >
          <Boxes size={13} strokeWidth={2} />
          Built with Hyperbrowser Sandboxes
        </a>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-24 pt-12 sm:px-6 sm:pt-14">
        {/* Header */}
        <header className="flex flex-col items-center text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            HYPERVIEW
          </h1>
          <p className="mt-2.5 max-w-xl text-sm text-muted sm:text-base">
            Watch an agent work on a real computer. Live UI, not a wall of markdown.
          </p>
        </header>

        {/* Input */}
        <section className="mt-8">
          <TaskInput loading={loading} onSubmit={run} />
        </section>

        {/* Error banner */}
        <AnimatePresence>
          {state.error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-xl border border-[#3a2020] bg-[#1a1212] px-5 py-4"
            >
              <AlertOctagon size={18} className="mt-0.5 shrink-0 text-[#e0a0a0]" strokeWidth={2} />
              <div className="flex-1">
                <p className="font-semibold text-[#e8c8c8]">Run failed</p>
                <p className="mt-1 break-words font-mono-code text-xs text-[#c8a0a0]">
                  {state.error}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspace */}
        <AnimatePresence>
          {started && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10"
            >
              <Workspace state={state} />

              {/* Done state actions */}
              {state.status === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-[#242424] bg-[#141414] px-6 py-6 text-center"
                >
                  {state.summary && (
                    <p className="max-w-2xl text-sm text-muted">{state.summary}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <ShareButton
                      task={state.task || "a task"}
                      liveUrl={state.previewUrl}
                      seconds={elapsedSeconds}
                    />
                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex items-center gap-2 rounded-full border border-[#242424] px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-[#3a3a3a]"
                    >
                      <RotateCcw size={15} strokeWidth={2.5} />
                      Run another
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-20 text-center font-mono-code text-[10px] uppercase tracking-widest text-muted/50">
          Powered by Hyperbrowser
        </footer>
      </div>
    </main>
  );
}
