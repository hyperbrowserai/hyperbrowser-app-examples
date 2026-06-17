"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileCode2, FileText } from "lucide-react";
import { Panel } from "./panel";
import type { SandboxFile } from "@/hooks/use-run";

function basename(path: string) {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function shortPath(path: string) {
  return path.replace(/^\/home\/user\/app\/?/, "") || path;
}

export function FilePanel({ files }: { files: SandboxFile[] }) {
  // null = follow the most recently written file; a path = user pinned that file.
  const [selected, setSelected] = useState<string | null>(null);

  const active = files.length > 0;
  const current =
    files.find((f) => f.path === selected) ?? files[files.length - 1];

  return (
    <Panel
      title="Files"
      icon={FileCode2}
      active={active}
      badge={active ? String(files.length) : undefined}
      className="h-full"
    >
      {active ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(120px,38%)_1fr]">
          <div className="min-h-0 overflow-auto border-r border-[#242424] py-1">
            <AnimatePresence initial={false}>
              {files.map((f) => (
                <motion.button
                  key={f.path}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  type="button"
                  onClick={() => setSelected(f.path)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono-code text-xs transition-colors ${
                    current?.path === f.path
                      ? "bg-[#1d1d1d] text-foreground"
                      : "text-muted hover:bg-[#181818] hover:text-foreground"
                  }`}
                  title={shortPath(f.path)}
                >
                  <FileText size={12} className="shrink-0" strokeWidth={2} />
                  <span className="truncate">{basename(f.path)}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          <div className="min-h-0 overflow-auto bg-[#0f0f0f]">
            {current && (
              <>
                <div className="sticky top-0 border-b border-[#242424] bg-[#0f0f0f] px-4 py-2 font-mono-code text-[11px] text-muted">
                  {shortPath(current.path)}
                </div>
                <pre className="px-4 py-3 font-mono-code text-[12px] leading-relaxed text-[#d8d8d4]">
                  {current.contents.split("\n").map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="w-7 shrink-0 select-none text-right text-muted/40">
                        {i + 1}
                      </span>
                      <span className="whitespace-pre-wrap break-words">{line || " "}</span>
                    </div>
                  ))}
                </pre>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="font-mono-code text-xs text-muted/60">
            Files the agent writes will appear here…
          </p>
        </div>
      )}
    </Panel>
  );
}
