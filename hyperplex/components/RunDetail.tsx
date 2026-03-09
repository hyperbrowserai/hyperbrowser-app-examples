"use client";

import { useState, useRef, useEffect } from "react";
import { AlertCircle, Loader2, Download, ChevronDown } from "lucide-react";
import { StepsTimeline } from "@/components/StepsTimeline";
import { SourcesList } from "@/components/SourcesList";
import { SubagentsList } from "@/components/SubagentsList";
import { useRunStream } from "@/hooks/useRunStream";
import { Skeleton } from "@/components/ui/skeleton";
import type { Run, ParsedOutput } from "@/types";

const EXPORT_FORMATS = [
  { value: "pdf",  label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "xlsx", label: "XLSX" },
  { value: "pptx", label: "PPTX" },
  { value: "html", label: "HTML" },
  { value: "md",   label: "Markdown" },
  { value: "json", label: "JSON" },
  { value: "csv",  label: "CSV" },
  { value: "txt",  label: "Plain Text" },
] as const;

function ExportDropdown({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {EXPORT_FORMATS.map((fmt) => (
            <a
              key={fmt.value}
              href={`/api/runs/${runId}/export?format=${fmt.value}`}
              download
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
            >
              {fmt.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

interface RunDetailProps {
  runId: string;
  initialRun?: Run;
}

function parseOutput(output?: string | null): ParsedOutput | null {
  if (!output) return null;
  try {
    return JSON.parse(output) as ParsedOutput;
  } catch {
    return null;
  }
}

function AnswerSection({ output }: { output: string }) {
  const parsed = parseOutput(output);
  if (!parsed) return <p className="text-sm text-gray-500">Could not parse answer.</p>;

  return (
    <div className="space-y-6">
      {/* Answer */}
      <div
        className="prose prose-base max-w-none prose-headings:text-black prose-p:text-black prose-a:text-black prose-a:underline"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(parsed.answer) }}
      />

      {/* Citations */}
      {parsed.citations.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-bold text-black mb-4">Citations</h3>
          <ol className="space-y-3">
            {parsed.citations.map((citation, i) => (
              <li key={i} className="flex gap-3 text-base">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white text-sm flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-black hover:underline block truncate"
                  >
                    {citation.title || citation.url}
                  </a>
                  {citation.quote && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2 italic font-normal">
                      &ldquo;{citation.quote}&rdquo;
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function extractStreamingAnswer(raw: string): string {
  const marker = '"answer"';
  const idx = raw.indexOf(marker);
  if (idx === -1) return "";

  let start = raw.indexOf('"', idx + marker.length);
  if (start === -1) return "";
  start += 1;

  let content = raw.slice(start);

  const citationsMarker = '","citations"';
  const citIdx = content.indexOf(citationsMarker);
  if (citIdx !== -1) {
    content = content.slice(0, citIdx);
  } else if (content.endsWith('"')) {
    content = content.slice(0, -1);
  }

  return content
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function parseMarkdownTable(block: string): string {
  const rows = block.trim().split("\n").filter(Boolean);
  if (rows.length < 2) return block;

  const parseRow = (row: string) =>
    row.split("|").map((c) => c.trim()).filter(Boolean);

  const headerCells = parseRow(rows[0]);
  const isSeparator = (r: string) => /^\|?[\s\-:|]+\|?$/.test(r);
  const dataStart = isSeparator(rows[1]) ? 2 : 1;

  let html = '<div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse border border-gray-200 rounded-lg">';
  html += "<thead><tr>";
  for (const cell of headerCells) {
    html += `<th class="text-left px-4 py-2.5 bg-gray-50 border border-gray-200 font-semibold text-black">${cell}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (let i = dataStart; i < rows.length; i++) {
    const cells = parseRow(rows[i]);
    if (cells.length === 0) continue;
    html += "<tr>";
    for (const cell of cells) {
      html += `<td class="px-4 py-2 border border-gray-200 text-gray-700">${cell}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  return html;
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].includes("|") && lines[i].trim().startsWith("|")) {
      let tableBlock = "";
      while (i < lines.length && lines[i].includes("|")) {
        tableBlock += lines[i] + "\n";
        i++;
      }
      blocks.push(parseMarkdownTable(tableBlock));
    } else {
      blocks.push(lines[i]);
      i++;
    }
  }

  let html = blocks
    .join("\n")
    .replace(/&(?!lt;|gt;|amp;|quot;)/g, "&amp;")
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold + Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Paragraph breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");

  html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

  return `<p>${html}</p>`;
}

export function RunDetail({ runId, initialRun }: RunDetailProps) {
  const { run: streamedRun, streamingTokens, isStreaming, isLoading } = useRunStream(
    initialRun?.status === "completed" || initialRun?.status === "failed" ? null : runId
  );

  const run = streamedRun ?? initialRun;

  if (isLoading && !run) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!run) return null;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {(run.status === "running" || run.status === "queued") && (
        <div className="flex items-center gap-3 text-base text-black bg-gray-100 px-5 py-3.5 rounded-xl border border-black">
          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
          <span className="font-medium">
            {run.status === "queued" ? "Queued, waiting to start..." : "Running research pipeline..."}
          </span>
        </div>
      )}

      {run.status === "failed" && (
        <div className="flex items-start gap-3 text-base text-black bg-gray-100 px-5 py-3.5 rounded-xl border border-black">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Run failed</p>
            {run.error && <p className="text-sm mt-1 text-gray-600">{run.error}</p>}
          </div>
        </div>
      )}

      {/* Subagents */}
      {(run.subagents ?? []).length > 0 && (
        <SubagentsList subagents={run.subagents ?? []} />
      )}

      {/* Steps */}
      {(run.status === "running" || run.status === "queued" || run.steps.length > 0) && (
        <div>
          <h3 className="text-xl font-bold text-black mb-5">Pipeline</h3>
          <StepsTimeline steps={run.steps} />
        </div>
      )}

      {/* Sources (deduplicated by URL) */}
      {run.sources.length > 0 && (() => {
        const unique = run.sources.filter(
          (s, i, arr) => arr.findIndex((x) => x.url === s.url) === i
        );
        return (
          <div>
            <h3 className="text-xl font-bold text-black mb-5">
              Sources ({unique.length})
            </h3>
            <SourcesList sources={unique} />
          </div>
        );
      })()}

      {/* Streaming answer (tokens arriving in real-time) */}
      {isStreaming && streamingTokens && !run.output && (() => {
        const answer = extractStreamingAnswer(streamingTokens);
        if (!answer) return null;
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-xl font-bold text-black">Answer</h3>
              <span className="text-sm text-gray-500 animate-pulse font-medium">streaming...</span>
            </div>
            <div
              className="prose prose-base max-w-none prose-headings:text-black prose-p:text-black"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(answer) }}
            />
          </div>
        );
      })()}

      {/* Final answer */}
      {run.status === "completed" && run.output && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-black">Answer</h3>
              {run.model && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full font-mono border border-gray-200">
                  {run.model}
                </span>
              )}
            </div>
            <ExportDropdown runId={run.id} />
          </div>
          <AnswerSection output={run.output} />
        </div>
      )}
    </div>
  );
}
