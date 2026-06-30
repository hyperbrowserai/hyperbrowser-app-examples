import { Copy, Download } from "lucide-react";
import { useState } from "react";

type ScriptPanelProps = {
  script: string;
};

export function ScriptPanel({ script }: ScriptPanelProps) {
  const [copied, setCopied] = useState(false);
  const hasScript = script.length > 0;
  const lineCount = Math.max(script.split("\n").length - 1, 1);
  const lineNumbers = Array.from({ length: lineCount }, (_, index) => index + 1);

  async function copyScript() {
    if (!hasScript) {
      return;
    }

    await navigator.clipboard.writeText(script);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function downloadScript() {
    if (!hasScript) {
      return;
    }

    const blob = new Blob([script], { type: "text/typescript" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = href;
    link.download = "hyperscript-run.ts";
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="grid h-[420px] min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden border border-border bg-paper">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="grid gap-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em]">
            Script After Run
          </p>
          <p className="font-mono text-xs">hyperscript-run.ts</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            className="flex h-8 items-center gap-2 border border-border px-3 font-mono text-[10px] uppercase tracking-[0.18em] disabled:bg-background"
            disabled={!hasScript}
            onClick={copyScript}
            type="button"
          >
            <Copy aria-hidden="true" size={14} strokeWidth={1.7} />
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            className="flex h-8 items-center gap-2 border border-border px-3 font-mono text-[10px] uppercase tracking-[0.18em] disabled:bg-background"
            disabled={!hasScript}
            onClick={downloadScript}
            type="button"
          >
            <Download aria-hidden="true" size={14} strokeWidth={1.7} />
            Download
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] border-b border-border bg-background font-mono text-[10px] uppercase tracking-[0.18em]">
        <div className="border-r border-border px-3 py-2">Ln</div>
        <div className="px-3 py-2">TypeScript</div>
      </div>

      <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)] overflow-auto bg-background font-mono text-[12px] leading-6">
        <div className="select-none border-r border-border px-3 py-4 text-right">
          {lineNumbers.map((lineNumber) => (
            <div key={lineNumber}>{lineNumber}</div>
          ))}
        </div>
        <pre className="min-h-0 p-4">
          <code>{script}</code>
        </pre>
      </div>
    </section>
  );
}
