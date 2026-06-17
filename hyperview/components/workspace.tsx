"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SandboxStatus } from "./sandbox-status";
import { TerminalPanel } from "./terminal-panel";
import { FilePanel } from "./file-panel";
import { BrowserPanel } from "./browser-panel";
import { PreviewPanel } from "./preview-panel";
import type { RunState } from "@/hooks/use-run";

export function Workspace({ state }: { state: RunState }) {
  const showBrowser = state.browser.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <SandboxStatus state={state} />

      {state.thinking && state.status !== "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-2 rounded-xl border border-[#242424] bg-[#121212] px-4 py-3"
        >
          <Sparkles size={14} className="mt-0.5 shrink-0 text-muted" strokeWidth={2} />
          <p className="font-mono-code text-[12.5px] leading-relaxed text-muted">
            {state.thinking}
          </p>
        </motion.div>
      )}

      {/* Top row: terminal + files */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-[360px]">
          <TerminalPanel output={state.terminal} />
        </div>
        <div className="h-[360px]">
          <FilePanel files={state.files} />
        </div>
      </div>

      {/* Browser appears only when the agent browses */}
      {showBrowser && (
        <div className="h-[320px]">
          <BrowserPanel captures={state.browser} />
        </div>
      )}

      {/* Live preview — the payoff */}
      <div className="h-[520px]">
        <PreviewPanel url={state.previewUrl} port={state.previewPort} />
      </div>
    </div>
  );
}
