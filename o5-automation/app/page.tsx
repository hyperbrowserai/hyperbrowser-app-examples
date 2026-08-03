"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, ExternalLink, Play, Terminal } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MemoryGraph } from "./memory-graph";
import type {
  MemoryComparison,
  MemorySnapshot,
  Phase,
  RunEvent,
  RunResult,
  Usage,
} from "@/lib/types";

const PIPELINE: Array<{ phase: Phase; label: string }> = [
  { phase: "remembering", label: "LOAD MEMORY" },
  { phase: "running", label: "AGENT RUN" },
  { phase: "learning", label: "RECORD MEMORY" },
  { phase: "done", label: "DONE" },
];

function elapsed(from?: number, to = Date.now()) {
  if (!from) return "—";
  return `${((to - from) / 1000).toFixed(1)}s`;
}

function delta(current: number, first: number, unit: (value: number) => string) {
  if (first === current) return "same";
  const difference = current - first;
  const percent = first > 0 ? Math.round((difference / first) * 100) : 0;
  return `${difference > 0 ? "+" : "−"}${unit(Math.abs(difference))}${
    first > 0 ? ` (${difference > 0 ? "+" : "−"}${Math.abs(percent)}%)` : ""
  }`;
}

function ResultView({ data }: { data: unknown }) {
  if (
    Array.isArray(data) &&
    data.length &&
    data.every((item) => item && typeof item === "object" && !Array.isArray(item))
  ) {
    const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row as object))));
    return (
      <div className="table-wrap">
        <table>
          <thead><tr>{keys.map((key) => <th key={key}>{key}</th>)}</tr></thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {keys.map((key) => (
                  <td key={key}>{String((row as Record<string, unknown>)[key] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return typeof data === "string"
    ? <p className="agent-result-text">{data}</p>
    : <pre className="result-json">{JSON.stringify(data, null, 2)}</pre>;
}

export default function Home() {
  const [task, setTask] = useState("");
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [phaseTimes, setPhaseTimes] = useState<Partial<Record<Phase, number>>>({});
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [liveLabel, setLiveLabel] = useState("Awaiting a run");
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  const [memory, setMemory] = useState<MemorySnapshot | null>(null);
  const [reusedEntries, setReusedEntries] = useState<string[]>([]);
  const [learnedEntries, setLearnedEntries] = useState<string[]>([]);
  const [staleEntries, setStaleEntries] = useState<string[]>([]);
  const [comparison, setComparison] = useState<MemoryComparison | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setClock(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [running]);

  const visiblePipeline = useMemo(
    () => PIPELINE.filter((item) => item.phase !== "learning" || phaseTimes.learning),
    [phaseTimes.learning]
  );

  function reset() {
    setPhase(null);
    setPhaseTimes({});
    setLiveUrl(null);
    setLiveLabel("Starting");
    setLogs([]);
    setResult(null);
    setUsage(null);
    setError(null);
    setTotalMs(null);
    setMemory(null);
    setReusedEntries([]);
    setLearnedEntries([]);
    setStaleEntries([]);
    setComparison(null);
  }

  function updateMemoryGraph(event: Extract<RunEvent, { t: "memory_learned" | "memory_write" }>) {
    setMemory((current) => {
      if (!current) return current;
      return {
        ...current,
        selectors: event.graph.entries.filter((entry) => entry.kind === "selector").length,
        navPaths: event.graph.entries.filter((entry) => entry.kind === "navigation").length,
        flows: event.graph.entries.filter((entry) => entry.kind === "flow").length,
        repairs: event.graph.entries.filter((entry) => entry.kind === "repair").length,
        notes: event.graph.entries.filter((entry) => entry.kind === "structure").length,
        envFacts: event.graph.entries.filter((entry) => entry.kind === "environment").length,
        graph: event.graph,
      };
    });
  }

  function handleEvent(event: RunEvent) {
    if (event.t === "phase") {
      setPhase(event.phase);
      setPhaseTimes((current) =>
        current[event.phase] ? current : { ...current, [event.phase]: event.at }
      );
    } else if (event.t === "live") {
      setLiveUrl(event.url);
      setLiveLabel(event.label);
    } else if (event.t === "plan") {
      setLogs((items) => [...items, event.note]);
    } else if (event.t === "run") {
      setLogs((items) => [...items, event.msg]);
    } else if (event.t === "step") {
      setLogs((items) => [...items, event.label]);
    } else if (event.t === "memory") {
      setMemory(event.snapshot);
      setLogs((items) => [
        ...items,
        event.snapshot.hit
          ? `Memory loaded: ${event.snapshot.navPaths} paths, ${event.snapshot.selectors} elements, ${event.snapshot.repairs} fixes`
          : `Exploration run: no memory for ${event.snapshot.domain}`,
      ]);
    } else if (event.t === "memory_learned") {
      updateMemoryGraph(event);
      if (event.labels.length) {
        setLearnedEntries((items) => [...new Set([...items, ...event.labels])]);
      }
      setStaleEntries(event.stale);
    } else if (event.t === "memory_reuse") {
      setReusedEntries(event.entries);
      setLogs((items) => [...items, `Reused ${event.entries.length} memory entries`]);
    } else if (event.t === "memory_repair_applied") {
      setLogs((items) => [...items, `Known fix reused: ${event.error}`]);
    } else if (event.t === "memory_write") {
      updateMemoryGraph(event);
      setLogs((items) => [
        ...items,
        `Memory saved: ${(event.bytes / 1024).toFixed(1)} KB${event.pruned ? `, ${event.pruned} entries evicted` : ""}`,
      ]);
    } else if (event.t === "memory_comparison") {
      setComparison(event.comparison);
    } else if (event.t === "result") {
      setResult(event.result);
    } else if (event.t === "usage") {
      setUsage(event.usage);
    } else if (event.t === "done") {
      setTotalMs(event.elapsedMs);
      setPhase(event.ok ? "done" : "failed");
      setPhaseTimes((current) => ({ ...current, done: Date.now() }));
    } else if (event.t === "need_url") {
      setError("Add the target URL, then run again.");
    } else if (event.t === "refused") {
      setError(event.reason);
    } else if (event.t === "error") {
      setError(event.message);
      setPhase("failed");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!task.trim() || !url.trim() || running) return;
    reset();
    setClock(Date.now());
    setRunning(true);
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.trim(), url: url.trim() }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${response.status})`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) handleEvent(JSON.parse(line) as RunEvent);
        if (done) break;
      }
      if (buffer.trim()) handleEvent(JSON.parse(buffer) as RunEvent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase("failed");
    } finally {
      setRunning(false);
    }
  }

  async function exportMemory() {
    if (!memory || exporting) return;
    setExporting(true);
    try {
      const response = await fetch(`/api/memory/${encodeURIComponent(memory.domain)}`);
      if (!response.ok) throw new Error("Memory is not saved yet.");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${memory.domain}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setExporting(false);
    }
  }

  return (
    <main>
      <div className="ascii ascii-a" aria-hidden="true">+--+--+{"\n"}| MEM |{"\n"}+--+--+</div>
      <div className="ascii ascii-b" aria-hidden="true">{"/// NAV\nHB::AGENT\nMEM::RUN"}</div>

      <header>
        <span className="brand-mark"><Image className="brand-logo" src="/hyperbrowser-symbol.svg" alt="Hyperbrowser" width={104} height={167} priority /></span>
        <div className="model-pill"><span className="status-dot" /> CLAUDE COMPUTER USE&nbsp; {CONFIG_MODEL}</div>
      </header>

      <section className="hero">
        <h1>Navigation Memory<br />for Browser Agents</h1>
        <p className="lede">First visit explores. Every visit after starts from what the last agent learned.</p>
      </section>

      <form className="command" onSubmit={submit}>
        <label htmlFor="task">BROWSER TASK</label>
        <div className="task-row">
          <textarea id="task" value={task} onChange={(event) => setTask(event.target.value)} placeholder="Find the top five trending TypeScript repositories" rows={2} required />
          <button type="submit" disabled={running || !task.trim() || !url.trim()}><Play size={16} />{running ? "AGENT RUNNING" : "RUN AGENT"}</button>
        </div>
        <div className="form-row">
          <div className="field grow">
            <label htmlFor="url">TARGET URL</label>
            <input id="url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/trending" required />
          </div>
        </div>
      </form>

      <section className="cockpit memory-product">
        <div className="run-column">
          <div className="browser panel">
            <div className="panel-head"><span>01 / AGENT LIVE VIEW</span><span>{liveLabel}</span></div>
            <div className="browser-bar"><i /><i /><i /><span>{liveUrl || "hyperbrowser://claude-computer-use"}</span>{liveUrl ? <a href={liveUrl} target="_blank" rel="noreferrer" aria-label="Open Live View"><ExternalLink size={13} /></a> : null}</div>
            <div className="browser-stage">
              {liveUrl ? <iframe src={liveUrl} title="Hyperbrowser Live View" allow="clipboard-read; clipboard-write" /> : <div className="empty-view"><span>HB</span><p>CLAUDE COMPUTER USE</p></div>}
            </div>
          </div>

          <div className="pipeline panel cockpit-log">
            <div className="panel-head"><span>02 / AGENT RUN</span><span>{running ? "LIVE" : phase === "done" ? "COMPLETE" : "IDLE"}</span></div>
            <div className="cockpit-log-body">
              <div className="steps">
                {visiblePipeline.map((item, index) => {
                  const active = phase === item.phase || (phase === "failed" && item.phase === "done");
                  const started = phaseTimes[item.phase];
                  const next = visiblePipeline.slice(index + 1).map((nextItem) => phaseTimes[nextItem.phase]).find(Boolean);
                  const complete = Boolean(started && next) || (item.phase === "done" && phase === "done");
                  return (
                    <div className={`step ${active ? "active" : ""} ${complete ? "complete" : ""}`} key={item.phase}>
                      <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="step-label">{complete ? <Check size={12} /> : null}{item.label}</span>
                      <span className="step-time">{started ? elapsed(started, next || clock) : "—"}</span>
                    </div>
                  );
                })}
              </div>
              <div className="activity">
                <div className="activity-head"><Terminal size={13} />AGENT ACTIONS</div>
                {logs.length ? logs.slice(-6).map((line, index) => <p key={`${line}-${index}`}><span>›</span>{line}</p>) : <p className="muted">Measured agent actions will appear here.</p>}
              </div>
            </div>
          </div>
        </div>

        <section className="memory panel">
          <div className="panel-head">
            <span>03 / NAVIGATION MEMORY</span>
            <div className="actions"><button type="button" onClick={exportMemory} disabled={!memory || exporting}><Download size={13} />{exporting ? "EXPORTING" : "EXPORT JSON"}</button></div>
          </div>
          <div className="memory-body">
            {memory ? (
              <>
                <p className={`memory-verdict ${memory.hit ? "hit" : "miss"}`}>
                  {memory.hit
                    ? `MEMORY LOADED: ${memory.navPaths} paths, ${memory.selectors} elements, ${memory.repairs} fixes`
                    : "EXPLORATION RUN — NO MEMORY FOR THIS SITE"}
                </p>
                {memory.graph.entries.length ? (
                  <MemoryGraph domain={memory.domain} priorRuns={memory.priorRuns} graph={memory.graph} reusedEntries={reusedEntries} staleSelectors={staleEntries} />
                ) : (
                  <div className="memory-first-run"><span>0</span><strong>NO STORED ENTRIES</strong><p>Memory will fill as the agent learns how to navigate {memory.domain}.</p></div>
                )}
                {learnedEntries.length ? <div className="memory-line"><span>LEARNED</span><ul className="memory-selectors">{learnedEntries.slice(-8).map((entry) => <li key={entry}>{entry}</li>)}</ul></div> : null}
                {reusedEntries.length ? <div className="memory-line prevented"><span>REUSED</span><ul className="memory-selectors">{reusedEntries.map((entry) => <li key={entry}>{entry}</li>)}</ul></div> : null}
                {staleEntries.length ? <div className="memory-line"><span>STALE / MISS</span><ul className="memory-selectors">{staleEntries.map((entry) => <li key={entry}>{entry}</li>)}</ul></div> : null}
                {comparison ? (
                  <div className="memory-compare">
                    <div className="compare-head"><span>MEASURED VS FIRST RUN</span><span>{new Date(comparison.first.at).toLocaleDateString()}</span></div>
                    <table>
                      <thead><tr><th>METRIC</th><th>FIRST</th><th>NOW</th><th>CHANGE</th></tr></thead>
                      <tbody>
                        <tr><td>Steps</td><td>{comparison.first.steps}</td><td>{comparison.current.steps}</td><td>{delta(comparison.current.steps, comparison.first.steps, String)}</td></tr>
                        <tr><td>Elapsed</td><td>{(comparison.first.elapsedMs / 1000).toFixed(1)}s</td><td>{(comparison.current.elapsedMs / 1000).toFixed(1)}s</td><td>{delta(comparison.current.elapsedMs, comparison.first.elapsedMs, (value) => `${(value / 1000).toFixed(1)}s`)}</td></tr>
                        <tr><td>Input</td><td>{comparison.first.inputTokens.toLocaleString()}</td><td>{comparison.current.inputTokens.toLocaleString()}</td><td>{delta(comparison.current.inputTokens, comparison.first.inputTokens, (value) => value.toLocaleString())}</td></tr>
                        <tr><td>Output</td><td>{comparison.first.outputTokens.toLocaleString()}</td><td>{comparison.current.outputTokens.toLocaleString()}</td><td>{delta(comparison.current.outputTokens, comparison.first.outputTokens, (value) => value.toLocaleString())}</td></tr>
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            ) : <div className="memory-awaiting-inline"><span>MEM</span><p>Run an agent to load or create domain memory.</p></div>}
          </div>
        </section>
      </section>

      <AnimatePresence>
        {(result || error) && (
          <motion.section className="agent-output panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="panel-head"><span>04 / AGENT RESULT</span><span>{result ? `${result.steps.length} MEASURED STEPS` : "FAILED"}</span></div>
            <div className="output-body">
              {error ? <div className="error-box"><strong>RUN FAILED</strong><p>{error}</p></div> : result ? <ResultView data={result.data} /> : null}
            </div>
            <div className="metrics">
              <span>MODEL <b>{CONFIG_MODEL}</b></span>
              <span>TOKENS <b>{usage ? `${usage.inputTokens.toLocaleString()} IN / ${usage.outputTokens.toLocaleString()} OUT` : "—"}</b></span>
              <span>TIME <b>{totalMs ? `${(totalMs / 1000).toFixed(1)}s` : "—"}</b></span>
              <span>MEMORY <b>{memory?.hit ? `${reusedEntries.length} REUSED` : "EXPLORATION"}</b></span>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}

const CONFIG_MODEL = "claude-opus-5";
