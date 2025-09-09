"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { motion } from "framer-motion";

type FetchResponse = {
  runId: string;
};

type QnaMetrics = {
  total_pairs: number;
  unique_questions: number;
  avg_question_len: number;
  avg_answer_len: number;
  completeness: number;
  duplicate_ratio: number;
};

type QnaResponse = {
  runId: string;
  files: { jsonl: string; csv: string; metrics: string };
  metrics: QnaMetrics;
  columns: string[];
  sampleRows: Array<Record<string, string | number>>;
};

import type { VisualizationSpec } from 'vega-embed';

function LiteChart({ spec, hasData }: { spec: VisualizationSpec; hasData: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let view: unknown;
    (async () => {
      if (!ref.current) return;
      const vegaEmbed = (await import("vega-embed")).default;
      const result = await vegaEmbed(ref.current, spec, { actions: false, renderer: "canvas" });
      view = result;
    })();
    return () => {
      if (view && typeof view === 'object' && 'destroy' in view && typeof view.destroy === 'function') {
        view.destroy();
      }
    };
  }, [spec]);
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        ease: "easeOut",
        delay: hasData ? 0.2 : 0
      }}
    />
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FetchResponse | null>(null);
  const [qna, setQna] = useState<QnaResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage<string>("hyperbrowser-api-key", "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    passage: 2700, 
    answer: 400, 
    question: 250, 
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setData(null);
    setQna(null);
    setLoading(true);
    setLogs(["Submitting URL", "Calling /api/fetch"]);
    try {
      const res = await fetch("/api/fetch", {
        method: "POST",
        headers: { 
          "content-type": "application/json",
          ...(apiKey ? { 
            "x-api-key": apiKey,
            "Authorization": `Bearer ${apiKey}`
          } : {})
        },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) {
        const errorMessage = json?.error || "Request failed";
        const errorType = json?.errorType;
        
        if (errorType === 'api_key_missing') {
          setShowSettings(true); // Open settings modal if API key is missing
          throw new Error(`${errorMessage} Please enter your API key in settings.`);
        }
        
        throw new Error(errorMessage);
      }
      setLogs((l) => [...l, "Received response", "Building QnA"]);
      const fetchData = { runId: json.runId } as FetchResponse;
      setData(fetchData);
      // fire QnA generation
      const qnaRes = await fetch('/api/qna', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          ...(apiKey ? { 
            "x-api-key": apiKey,
            "Authorization": `Bearer ${apiKey}`
          } : {})
        },
        body: JSON.stringify({ runId: fetchData.runId, url }),
      });
      const qnaJson = await qnaRes.json();
      if (!qnaRes.ok) {
        const errorMessage = qnaJson?.error || "QnA failed";
        const errorType = qnaJson?.errorType;
        
        if (errorType === 'api_key_missing') {
          setShowSettings(true); // Open settings modal if API key is missing
          throw new Error(`${errorMessage} Please enter your API key in settings.`);
        }
        
        if (errorType === 'openai_key_missing') {
          throw new Error(`${errorMessage} This is a server configuration issue.`);
        }
        
        throw new Error(errorMessage);
      }
      setQna(qnaJson as QnaResponse);
      setLogs((l) => [...l, `QnA pairs: ${qnaJson?.metrics?.total_pairs ?? 0}`, 'Done']);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLogs((l) => [...l, `Error: ${err instanceof Error ? err.message : "Unknown"}`]);
    } finally {
      setLoading(false);
    }
  }

  const metrics = qna?.metrics || { total_pairs: 0, unique_questions: 0, avg_question_len: 0, avg_answer_len: 0, completeness: 0, duplicate_ratio: 0 };

  const chartSpec = useMemo(() => {
    type QnaRow = {
      question?: string;
      answer?: string;
    };
    
    const values = (qna?.sampleRows || []).map((r) => ({
      qlen: String((r as QnaRow).question || '').length,
      alen: String((r as QnaRow).answer || '').length,
    }));
    if (values.length === 0) {
      return {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        background: null,
        config: {
          axis: { 
            labelColor: "#ededed", 
            titleColor: "#ededed",
            gridColor: "#2a2a2a",
            domainColor: "#2a2a2a"
          },
          text: { color: "#ededed" }
        },
        data: { values: [{ qlen: 0, alen: 0 }] },
        mark: { type: "point", filled: true, size: 40 },
        encoding: {
          x: { field: "qlen", type: "quantitative", title: "Question length" },
          y: { field: "alen", type: "quantitative", title: "Answer length" },
        },
        width: 320,
        height: 160,
      };
    }
    return {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      background: null,
      config: {
        axis: { 
          labelColor: "#ededed", 
          titleColor: "#ededed",
          gridColor: "#2a2a2a",
          domainColor: "#2a2a2a"
        },
        text: { color: "#ededed" }
      },
      data: { values },
      mark: { type: "point", filled: true, size: 40 },
      encoding: {
        x: { field: "qlen", type: "quantitative", title: "Question length" },
        y: { field: "alen", type: "quantitative", title: "Answer length" },
        color: { value: "#F0FF26" },
      },
      width: 320,
      height: 160,
    };
  }, [qna]);

  function downloadCsv() {
    if (!qna?.files?.csv) return;
    const link = document.createElement("a");
    link.href = qna.files.csv;
    link.download = `qna-${qna.runId}.csv`;
    link.click();
  }

  function handleColumnResize(column: string, width: number) {
    setColumnWidths(prev => ({ ...prev, [column]: Math.max(80, width) }));
  }

  function ResizableHeader({ column, children }: { column: string; children: React.ReactNode }) {
    const [isResizing, setIsResizing] = useState(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = columnWidths[column] || 150;
      e.preventDefault();
    };

    useEffect(() => {
      if (!isResizing) return;

      const handleMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startXRef.current;
        const newWidth = startWidthRef.current + diff;
        handleColumnResize(column, newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isResizing, column]);

    let defaultWidth = 250;
    if (column === 'passage') defaultWidth = 2700;
    if (column === 'answer') defaultWidth = 400;
    if (column === 'question') defaultWidth = 250;
    
    return (
      <th 
        className="text-left px-2 py-1 whitespace-nowrap font-medium relative group border-r border-[color:var(--color-border)] last:border-r-0"
        style={{ 
          width: columnWidths[column] || defaultWidth, 
          minWidth: column === 'passage' ? 80 : 150,
          maxWidth: column === 'passage' ? (columnWidths.passage || 2700) : 'none'
        }}
      >
        {children}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-[#F0FF26] transition-all"
          onMouseDown={handleMouseDown}
        />
      </th>
    );
  }

  function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        className="inline-flex items-center gap-2 border border-[color:var(--color-border)] rounded-lg px-3 py-1 text-sm hover:bg-[color:var(--color-muted)]"
        onClick={onClick}
        aria-label={label}
        title={label}
      >
        {children}
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function IconSliders() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="21" y1="4" x2="14" y2="4"></line>
        <line x1="10" y1="4" x2="3" y2="4"></line>
        <line x1="21" y1="12" x2="12" y2="12"></line>
        <line x1="8" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="20" x2="16" y2="20"></line>
        <line x1="12" y1="20" x2="3" y2="20"></line>
        <circle cx="12" cy="4" r="2"></circle>
        <circle cx="8" cy="12" r="2"></circle>
        <circle cx="16" cy="20" r="2"></circle>
      </svg>
    );
  }

  function IconCode() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    );
  }

  function IconSettings() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    );
  }

  function IconEyeOpen() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    );
  }

  function IconEyeClosed() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    );
  }

  function IconKey() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2"></path>
        <path d="M7.5 13.5L9 12a6 6 0 108.49-8.49L16 5"></path>
        <path d="M7 14l-5 5"></path>
        <path d="M2 19l3 3"></path>
      </svg>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col">
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-3 mb-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="HyperDataLab" className="w-6 h-6" />
          <h1 className="text-xl sm:text-2xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>HyperDataLab</h1>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Settings" onClick={() => setShowSettings(true)}>
            <IconSettings />
          </IconButton>
          <IconButton label="Code" onClick={() => setShowCode(true)}>
            <IconCode />
          </IconButton>
          <a href="https://hyperbrowser.ai" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[color:var(--color-border)] rounded-lg px-3 py-1 text-sm hover:bg-[color:var(--color-muted)]">
            <IconKey />
            <span className="hidden sm:inline">Get API Key</span>
          </a>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left: Visualization + Console */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="border border-[color:var(--color-border)] rounded-lg p-4 bg-[color:var(--color-panel)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>Datagraph</h2>
              <span className="text-xs opacity-70">quality</span>
            </div>
            <LiteChart spec={chartSpec as unknown as VisualizationSpec} hasData={!!qna && qna.sampleRows.length > 0} />
            <motion.div 
              className="mt-2 text-xs opacity-75"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.75, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Completeness: <span style={{ fontFamily: 'DM Mono, monospace' }}>{metrics.completeness}%</span>
            </motion.div>
          </div>

          <div className="border border-[color:var(--color-border)] rounded-lg p-4 h-[260px] overflow-auto bg-[color:var(--color-panel)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>Progress Console</h2>
              {loading && <span className="text-xs">running…</span>}
            </div>
            <ul className="text-sm space-y-1" style={{ fontFamily: 'DM Mono, monospace' }}>
              {logs.map((l, i) => (
                <li key={i}>- {l}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right: Controls + QnA Preview */}
        <section className="lg:col-span-8 flex flex-col">
          <form onSubmit={onSubmit} className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="url"
                required
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full border border-[color:var(--color-border)] rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-[#00FF88] focus:ring-1 focus:ring-[#00FF88]"
              />
              {!apiKey && (
                <div className="absolute -bottom-5 left-0 text-xs text-[#00FF88]">
                  Set up your API key from the settings. Get it at <a href="https://hyperbrowser.ai" target="_blank" rel="noreferrer" className="underline">hyperbrowser.ai</a>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} className="border border-[color:var(--color-border)] rounded-lg px-4 py-2 disabled:opacity-60 hover:bg-[color:var(--color-muted)]">
              {loading ? "Submit…" : "Submit"}
            </button>
            {qna?.metrics?.total_pairs ? (
              <button type="button" onClick={downloadCsv} className="border border-[color:var(--color-border)] rounded-lg px-3 py-2 hover:bg-[color:var(--color-muted)]">Download CSV</button>
            ) : null}
          </form>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          <div className="border border-[color:var(--color-border)] rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-panel)]">
              <h3 className="font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>QnA Preview</h3>
              <div className="text-xs opacity-70">
                {qna?.metrics?.total_pairs || 0} pairs
              </div>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[color:var(--color-muted)]">
                    {(qna?.columns || []).map((c) => (
                      <ResizableHeader key={c} column={c}>
                        {c}
                      </ResizableHeader>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(qna?.sampleRows || [])
                    .slice(0, showAllRows ? undefined : 10)
                    .map((r, i) => (
                    <tr key={i} className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-muted)]/30">
                      {(qna?.columns || []).map((c) => (
                        <td 
                          key={c} 
                          className="px-2 py-1.5 align-top border-r border-[color:var(--color-border)] last:border-r-0"
                          style={{ 
                            width: columnWidths[c] || (
                              c === 'passage' ? 2700 : 
                              c === 'answer' ? 400 : 
                              c === 'question' ? 250 : 150
                            ),
                            maxWidth: c === 'passage' ? (columnWidths.passage || 2700) : 'none',
                            minWidth: c === 'passage' ? 80 : 150
                          }}
                        >
                          {c === 'passage' ? (
                            <div className="whitespace-pre-wrap break-words leading-relaxed overflow-hidden" 
                                 style={{ 
                                   maxWidth: columnWidths.passage || 2700,
                                   overflowWrap: 'break-word',
                                   wordBreak: 'break-all'
                                 }}>
                              {String((r as Record<string, string | number>)[c] ?? '')}
                            </div>
                          ) : c === 'answer' || c === 'question' ? (
                            <div className="whitespace-pre-wrap break-words max-w-full leading-relaxed">
                              {String((r as Record<string, string | number>)[c] ?? '')}
                            </div>
                          ) : (
                            <div className="truncate max-w-full" title={String((r as Record<string, string | number>)[c] ?? '')}>
                              {String((r as Record<string, string | number>)[c] ?? '')}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {(!qna || (qna.sampleRows || []).length === 0) && (
                    <tr>
                                             <td className="px-2 py-4 text-center text-sm opacity-70" colSpan={(qna?.columns || []).length || 1}>
                        No QnA extracted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {qna && qna.sampleRows.length > 10 && (
              <div className="flex justify-center py-3 border-t border-[color:var(--color-border)] bg-[color:var(--color-panel)]">
                <button
                  onClick={() => setShowAllRows(!showAllRows)}
                  className="text-xs border border-[color:var(--color-border)] rounded px-3 py-1.5 hover:bg-[color:var(--color-muted)] transition-colors"
                >
                  {showAllRows ? 'Show Less' : 'See More'}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modals */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-[color:var(--color-panel)] text-[color:var(--color-foreground)] w-full max-w-md rounded border border-[color:var(--color-border)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-2">
              <h3 className="font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>Settings</h3>
              <button className="text-sm" onClick={() => setShowSettings(false)}>Close</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="api-key" className="block text-sm font-medium">Hyperbrowser API Key</label>
                  <a 
                    href="https://hyperbrowser.ai" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs text-[#00FF88] hover:underline"
                  >
                    Get API key from hyperbrowser.ai
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value.trim())}
                    placeholder="hb_live_..."
                    spellCheck="false"
                    autoComplete="off"
                    className="w-full border border-[color:var(--color-border)] rounded-lg px-3 py-2 pr-[4.5rem] bg-transparent font-mono text-sm focus:outline-none focus:border-[#00FF88] focus:ring-1 focus:ring-[#00FF88]"
                  />
                  <div className="absolute right-1 top-1 flex gap-1">
                    <button 
                      type="button" 
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="px-2 py-1 text-xs rounded hover:bg-[color:var(--color-muted)]"
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                      title={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? <IconEyeClosed /> : <IconEyeOpen />}
                    </button>
                    {navigator.clipboard && (
                      <button 
                        type="button" 
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey);
                        }}
                        className="px-2 py-1 text-xs rounded hover:bg-[color:var(--color-muted)]"
                        aria-label="Copy API key"
                        title="Copy API key"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs opacity-70">Your API key is stored locally in your browser.</p>
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  type="button" 
                  onClick={async () => {
                    if (navigator.clipboard) {
                      try {
                        const text = await navigator.clipboard.readText();
                        const trimmed = text.trim();
                        if (trimmed.startsWith('hb_') || trimmed.length > 20) {
                          setApiKey(trimmed);
                        }
                      } catch (err) {
                        // Clipboard access denied
                      }
                    }
                  }}
                  className="border border-[color:var(--color-border)] rounded-lg px-3 py-1.5 text-sm hover:bg-[color:var(--color-muted)]"
                >
                  Paste from clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCode(false)}>
          <div className="bg-[color:var(--color-panel)] text-[color:var(--color-foreground)] w-full max-w-2xl rounded border border-[color:var(--color-border)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-2">
              <h3 className="font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>Code</h3>
              <button className="text-sm" onClick={() => setShowCode(false)}>Close</button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm opacity-80">Our official examples are available on <a href="https://github.com/hyperbrowserai/hyperbrowser-app-examples" target="_blank" rel="noreferrer" className="underline">GitHub</a></p>
              <pre className="text-xs bg-[color:var(--color-muted)] p-3 rounded overflow-auto">
{`import { Hyperbrowser } from '@hyperbrowser/sdk';

const client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY });
const session = await (client as any).sessions.create({ useStealth: true, solveCaptchas: true });
const result = await (client as any).scrape.startAndWait({
  url: 'https://example.com',
  sessionId: session.id,
  actions: [ { type: 'wait', ms: 1200 }, { type: 'scroll', direction: 'down', repetitions: 4 } ],
  output: { html: true, text: true, screenshot: { fullPage: true } },
});`}
              </pre>
              <p className="text-sm opacity-80">cURL</p>
              <pre className="text-xs bg-[color:var(--color-muted)] p-3 rounded overflow-auto">
{`curl -X POST 'https://api.hyperbrowser.ai/v1/scrape.startAndWait' \
  -H 'Authorization: Bearer $HYPERBROWSER_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","output":{"html":true,"text":true}}'`}
              </pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
