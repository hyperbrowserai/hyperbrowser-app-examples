"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UrlInput } from "@/components/url-input";
import { LearnStream } from "@/components/learn-stream";
import { MemoryCard } from "@/components/memory-card";
import { MemoryTree } from "@/components/memory-tree";
import { RecallBanner } from "@/components/recall-banner";
import { BrainPanel } from "@/components/brain-panel";
import { ShareButton } from "@/components/share-button";
import type { BrainEvent, BrainSummary, Memory } from "@/lib/types";

type Phase = "idle" | "learning" | "done";

interface Result {
  source: "recall" | "learn";
  memory: Memory;
  ms: number;
}

function domainOf(input: string): string {
  try {
    const u = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return input;
  }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<string[]>([]);
  const [screenshot, setScreenshot] = useState<string | undefined>();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<BrainSummary[]>([]);
  const [mode, setMode] = useState<"volume" | "local">("volume");
  const [elapsed, setElapsed] = useState(0);
  const [learningDomain, setLearningDomain] = useState("");

  const timerStart = useRef(0);

  const refreshBrain = useCallback(async () => {
    try {
      const res = await fetch("/api/brain/list");
      const data = await res.json();
      setDomains(data.domains ?? []);
      if (data.mode) setMode(data.mode);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBrain() {
      try {
        const res = await fetch("/api/brain/list");
        const data = await res.json();
        if (cancelled) return;
        setDomains(data.domains ?? []);
        if (data.mode) setMode(data.mode);
      } catch {
        /* ignore */
      }
    }

    loadBrain();

    return () => {
      cancelled = true;
    };
  }, []);

  // live count-up timer during the learn path
  useEffect(() => {
    if (phase !== "learning") return;
    const id = setInterval(() => setElapsed(Date.now() - timerStart.current), 50);
    return () => clearInterval(id);
  }, [phase]);

  const run = useCallback(
    async (target: string) => {
      const value = target.trim();
      if (!value) return;

      setError(null);
      setResult(null);
      setScreenshot(undefined);
      setSteps([]);
      setLearningDomain(domainOf(value));
      timerStart.current = Date.now();
      setElapsed(0);
      setPhase("learning");

      try {
        const res = await fetch("/api/brain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: value }),
        });
        if (!res.body) throw new Error("No response stream");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const evt = JSON.parse(line) as BrainEvent;
            if (evt.type === "step") {
              setSteps((s) => [...s, evt.label]);
            } else if (evt.type === "screenshot") {
              setScreenshot(evt.url);
            } else if (evt.type === "error") {
              setError(evt.message);
              setPhase("idle");
            } else if (evt.type === "result") {
              setResult({ source: evt.source, memory: evt.memory, ms: evt.ms });
              setPhase("done");
            }
          }
        }
        await refreshBrain();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("idle");
      }
    },
    [refreshBrain],
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black text-white">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="border-b border-white/10 p-6"
      >
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
              BrowserBrain
            </h1>
            <p className="font-mono mt-1 text-xs text-white/60">
              AI BROWSING MEMORY SYSTEM
            </p>
          </div>
          <p className="font-mono shrink-0 text-right text-xs text-white/40">
            Built with{" "}
            <a
              href="https://hyperbrowser.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:underline"
            >
              Hyperbrowser
            </a>
          </p>
        </div>
      </motion.header>

      <UrlInput
        value={url}
        onChange={setUrl}
        onSubmit={() => run(url)}
        disabled={phase === "learning"}
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-red-900/30 bg-red-950/30 px-6 py-3"
        >
          <p className="font-mono text-xs text-red-400">ERROR: {error}</p>
        </motion.div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <main className="min-h-0 flex-1 overflow-y-auto border-white/10 lg:border-r">
          <div className="border-b border-white/10 p-4">
            <h2 className="font-mono text-xs text-white/60">ACTIVE MEMORY VIEW</h2>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {phase === "learning" && (
                <motion.div
                  key="learn"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <LearnStream
                    domain={learningDomain}
                    elapsedMs={elapsed}
                    steps={steps}
                    screenshot={screenshot}
                  />
                </motion.div>
              )}

              {phase === "done" && result && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-4"
                >
                  {result.source === "recall" ? (
                    <RecallBanner
                      domain={result.memory.domain}
                      learnedAt={result.memory.learnedAt}
                      recallMs={result.ms}
                      learnMs={result.memory.learnMs}
                    />
                  ) : (
                    <div className="flex items-center justify-between border border-white/20 bg-white/[0.03] px-5 py-4">
                      <span className="text-sm text-white/90">
                        Learned <span className="font-mono text-white">{result.memory.domain}</span>
                      </span>
                      <span className="font-mono text-2xl tabular-nums text-white">
                        {(result.ms / 1000).toFixed(1)}s
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <ShareButton
                      domain={result.memory.domain}
                      learnMs={result.memory.learnMs}
                      recallMs={result.source === "recall" ? result.ms : undefined}
                    />
                  </div>

                  <MemoryTree memory={result.memory} animate={result.source === "learn"} />
                  <MemoryCard memory={result.memory} animate={result.source === "learn"} />
                </motion.div>
              )}

              {phase === "idle" && !error && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="inner-glow flex min-h-[420px] items-center justify-center border border-dashed border-white/10 text-center"
                >
                  <div className="max-w-sm px-6">
                    <p className="font-mono text-sm text-white/40">NO URL LOADED</p>
                    <p className="mt-3 text-sm leading-relaxed text-white/60">
                      Paste a URL. First visit, BrowserBrain learns the page. Every visit
                      after, it recalls the page instantly.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <aside className="min-h-0 border-t border-white/10 lg:w-[360px] lg:border-t-0">
          <BrainPanel
            domains={domains}
            mode={mode}
            onPick={(u) => {
              setUrl(u);
              run(u);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
