"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MonitorPlay, ExternalLink, Copy, Check } from "lucide-react";
import { Panel } from "./panel";

export function PreviewPanel({ url, port }: { url: string | null; port: number | null }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Panel
      title="Live Preview"
      icon={MonitorPlay}
      active={!!url}
      badge={port ? `:${port}` : undefined}
      className="h-full"
    >
      {url ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex items-center gap-2 border-b border-[#242424] px-3 py-2">
            <span className="truncate font-mono-code text-[11px] text-muted">{url}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 rounded-md border border-[#242424] px-2 py-1 font-mono-code text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-[#3a3a3a] hover:text-foreground"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-[#242424] px-2 py-1 font-mono-code text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-[#3a3a3a] hover:text-foreground"
              >
                <ExternalLink size={11} />
                Open
              </a>
            </div>
          </div>
          <iframe
            src={url}
            title="Live preview"
            className="min-h-0 w-full flex-1 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </motion.div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="font-mono-code text-xs text-muted/60">
            When the agent exposes a port, the live URL renders here.
          </p>
        </div>
      )}
    </Panel>
  );
}
