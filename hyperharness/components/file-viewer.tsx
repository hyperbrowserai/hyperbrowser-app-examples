"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";

interface Props {
  claudeMd: string;
  agentsMd: string;
}

type Tab = "CLAUDE.md" | "AGENTS.md";

export function FileViewer({ claudeMd, agentsMd }: Props) {
  const [tab, setTab] = useState<Tab>("CLAUDE.md");
  const [copied, setCopied] = useState(false);

  const content = tab === "CLAUDE.md" ? claudeMd : agentsMd;

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function download() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border-4 border-black bg-white shadow-brutal">
      <div className="flex items-stretch border-b-4 border-black">
        {(["CLAUDE.md", "AGENTS.md"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest font-mono border-r-4 border-black transition-colors ${
              tab === t ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-stretch">
          <button
            type="button"
            onClick={copy}
            className="px-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest border-l-4 border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
          >
            {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.5} />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={download}
            className="px-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest border-l-4 border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
          >
            <Download size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>
      <pre className="bg-[#141414] text-gray-100 p-5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed max-h-[480px] overflow-y-auto whitespace-pre-wrap">
        {content || "(empty)"}
      </pre>
    </div>
  );
}
