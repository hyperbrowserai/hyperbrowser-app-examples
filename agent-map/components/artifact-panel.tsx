"use client";

import { Copy, Download, FileJson, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import type { AgentMap } from "@/lib/types";
import { compactUrl } from "@/lib/url-utils";

type ArtifactPanelProps = {
  artifact: AgentMap | null;
  compact?: boolean;
};

export function ArtifactPanel({ artifact, compact = false }: ArtifactPanelProps) {
  const [mode, setMode] = useState<"json" | "markdown">("json");
  const content = useMemo(() => {
    if (!artifact) {
      return "";
    }

    return mode === "json"
      ? JSON.stringify(artifact, null, 2)
      : toMarkdown(artifact);
  }, [artifact, mode]);

  async function copyArtifact() {
    if (!content) {
      return;
    }

    await navigator.clipboard.writeText(content);
  }

  function downloadArtifact() {
    if (!content) {
      return;
    }

    const blob = new Blob([content], {
      type: mode === "json" ? "application/json" : "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-map.${mode === "json" ? "json" : "md"}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--panel)]">
      <div
        className={[
          "flex shrink-0 flex-col border-b border-[var(--border)]",
          compact
            ? "gap-2 px-3 py-2"
            : "gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between",
        ].join(" ")}
      >
        <div>
          <h2 className="font-heading text-sm font-semibold tracking-tight">
            Structured artifact
          </h2>
          <p
            className={[
              "mt-1 text-sm text-[var(--muted)]",
              compact ? "hidden" : "",
            ].join(" ")}
          >
            JSON for agents, with a readable markdown view for humans.
          </p>
        </div>

        <div
          className={[
            "min-w-0 gap-1.5",
            compact
              ? "grid grid-cols-2"
              : "flex flex-wrap items-center overflow-hidden",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => setMode("json")}
            className={buttonClass(mode === "json", compact)}
          >
            <FileJson className={compact ? "hidden" : ""} size={14} />
            JSON
          </button>
          <button
            type="button"
            onClick={() => setMode("markdown")}
            className={buttonClass(mode === "markdown", compact)}
          >
            <FileText className={compact ? "hidden" : ""} size={14} />
            Markdown
          </button>
          <button
            type="button"
            onClick={copyArtifact}
            disabled={!artifact}
            className={actionClass(compact)}
          >
            <Copy className={compact ? "hidden" : ""} size={14} />
            Copy
          </button>
          <button
            type="button"
            onClick={downloadArtifact}
            disabled={!artifact}
            className={actionClass(compact)}
          >
            <Download className={compact ? "hidden" : ""} size={14} />
            Download
          </button>
        </div>
      </div>

      <pre
        className={[
          "min-h-0 flex-1 overflow-auto font-mono text-[var(--muted)]",
          compact
            ? "whitespace-pre-wrap break-words p-3 text-[0.72rem] leading-5"
            : "p-3 text-[0.68rem] leading-5",
        ].join(" ")}
      >
        {artifact
          ? content
          : "Run a crawl to generate the real agent-ready map artifact."}
      </pre>
    </section>
  );
}

function buttonClass(active: boolean, compact: boolean) {
  return [
    "flex items-center justify-center gap-2 border font-mono uppercase tracking-[0.16em] transition",
    compact ? "h-8 px-2 text-[0.62rem]" : "h-9 px-3 text-[0.65rem]",
    active
      ? "border-[var(--foreground)] text-[var(--foreground)]"
      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]",
  ].join(" ");
}

function actionClass(compact: boolean) {
  return [
    "flex items-center justify-center gap-2 border border-[var(--border)] font-mono uppercase tracking-[0.16em] text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-45",
    compact ? "h-8 px-2 text-[0.62rem]" : "h-9 px-3 text-[0.65rem]",
  ].join(" ");
}

function toMarkdown(artifact: AgentMap) {
  const lines = [
    `# Agent Map: ${compactUrl(artifact.rootUrl)}`,
    "",
    `Generated: ${artifact.generatedAt}`,
    `Crawl status: ${artifact.crawl.status}`,
    `Pages: ${artifact.crawl.totalPages}`,
    `Edges: ${artifact.edges.length}`,
    "",
    "## Pages",
    "",
  ];

  for (const page of artifact.pages) {
    lines.push(`### ${page.title || compactUrl(page.url)}`);
    lines.push(`- URL: ${page.url}`);
    lines.push(`- Status: ${page.status}`);

    if (page.description) {
      lines.push(`- Description: ${page.description}`);
    }

    if (page.summary?.purpose) {
      lines.push(`- Purpose: ${page.summary.purpose}`);
    }

    if (page.summary?.keyActions.length) {
      lines.push(`- Key actions: ${page.summary.keyActions.join("; ")}`);
    }

    if (page.summary?.primaryData.length) {
      lines.push(`- Primary data: ${page.summary.primaryData.join("; ")}`);
    }

    if (page.internalLinks.length) {
      lines.push(`- Internal links: ${page.internalLinks.map(compactUrl).join(", ")}`);
    }

    if (page.error) {
      lines.push(`- Error: ${page.error}`);
    }

    lines.push("");
  }

  lines.push("## Link flows", "");

  if (artifact.edges.length === 0) {
    lines.push("No internal link flows were found between crawled pages.");
  } else {
    for (const edge of artifact.edges) {
      lines.push(`- ${compactUrl(edge.source)} -> ${compactUrl(edge.target)}`);
    }
  }

  return lines.join("\n");
}
