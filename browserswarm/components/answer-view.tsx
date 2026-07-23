"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import type { RunState } from "@/lib/use-swarm";

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${(s % 60).toString().padStart(2, "0")}s` : `${s}s`;
}

export function AnswerView({ state }: { state: RunState }) {
  const answering = state.phase === "answering" && state.status === "running";
  const stats = state.stats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-3xl mx-auto w-full"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-black border-2 border-black px-2 py-1">
          Kimi K3 · Answer
        </span>
        {answering && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <Loader2 size={11} strokeWidth={3} className="animate-spin" />
            streaming from shared memory
          </span>
        )}
      </div>

      <div className="border-4 border-black bg-white shadow-brutal-lg p-5 sm:p-7">
        {state.answer.length === 0 && answering ? (
          <p className="font-mono text-sm text-gray-400">
            K3 is reading everything the swarm gathered…
          </p>
        ) : (
          <div className="answer-prose text-[15px] leading-relaxed text-black">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: (p) => <h1 className="text-2xl font-bold mt-6 mb-3 first:mt-0" {...p} />,
                h2: (p) => <h2 className="text-xl font-bold mt-6 mb-2 first:mt-0" {...p} />,
                h3: (p) => <h3 className="text-base font-bold uppercase tracking-wide mt-5 mb-2" {...p} />,
                p: (p) => <p className="mb-3" {...p} />,
                ul: (p) => <ul className="list-disc pl-5 mb-3 space-y-1" {...p} />,
                ol: (p) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...p} />,
                li: (p) => <li className="marker:text-gray-400" {...p} />,
                a: (p) => (
                  <a
                    className="font-mono text-[13px] underline decoration-2 underline-offset-2 hover:bg-black hover:text-white break-all"
                    target="_blank"
                    rel="noreferrer"
                    {...p}
                  />
                ),
                code: (p) => (
                  <code className="font-mono text-[13px] bg-gray-100 border border-gray-200 px-1 py-0.5" {...p} />
                ),
                strong: (p) => <strong className="font-bold" {...p} />,
                table: (p) => (
                  <div className="overflow-x-auto my-4 border-2 border-black">
                    <table className="w-full text-sm border-collapse" {...p} />
                  </div>
                ),
                thead: (p) => <thead className="bg-black text-white" {...p} />,
                th: (p) => (
                  <th className="text-left font-bold uppercase tracking-widest text-[10px] px-3 py-2 border border-black" {...p} />
                ),
                td: (p) => (
                  <td className="align-top px-3 py-2 border border-gray-200 font-mono text-[12px]" {...p} />
                ),
                blockquote: (p) => (
                  <blockquote className="border-l-4 border-black pl-3 italic text-gray-600 my-3" {...p} />
                ),
              }}
            >
              {state.answer}
            </ReactMarkdown>
            {answering && (
              <span className="inline-block w-2 h-4 bg-black align-middle animate-pulse ml-0.5" />
            )}
          </div>
        )}
      </div>

      {/* final stats line — all real */}
      {stats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-gray-600"
        >
          <Stat n={stats.pages} unit="pages" />
          <Sep />
          <Stat n={stats.sites} unit="sites" />
          <Sep />
          <span className="text-black font-medium">one prompt</span>
          <Sep />
          <span className="text-black font-medium tnum">{fmtElapsed(stats.elapsedMs)}</span>
          <Sep />
          <span className="tnum">
            {stats.tokens.toLocaleString()} tok <span className="text-gray-400">(est)</span>
          </span>
          <Sep />
          <span className="tnum">~${stats.costUsd.toFixed(2)}</span>
          {stats.capped && (
            <>
              <Sep />
              <span className="text-black font-medium">context budget reached</span>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function Stat({ n, unit }: { n: number; unit: string }) {
  return (
    <span>
      <span className="text-black font-medium tnum">{n.toLocaleString()}</span> {unit}
    </span>
  );
}

function Sep() {
  return <span className="text-gray-300">·</span>;
}
