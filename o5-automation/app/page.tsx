"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Download, ExternalLink, Play, ShieldCheck, Terminal } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Phase, RunEvent, RunResult, Usage } from "@/lib/types";

const PIPELINE: Array<{ phase: Phase; label: string }> = [
  { phase: "inspecting", label: "INSPECTING SITE" },
  { phase: "writing", label: "WRITING AUTOMATION" },
  { phase: "running", label: "RUNNING" },
  { phase: "repairing", label: "REPAIRING" },
  { phase: "done", label: "DONE" },
];

function elapsed(from?: number, to = Date.now()) {
  if (!from) return "—";
  return `${((to - from) / 1000).toFixed(1)}s`;
}

function ResultView({ data }: { data: unknown }) {
  if (Array.isArray(data) && data.length && data.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row as object))));
    return (
      <div className="table-wrap">
        <table>
          <thead><tr>{keys.map((key) => <th key={key}>{key}</th>)}</tr></thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>{keys.map((key) => <td key={key}>{String((row as Record<string, unknown>)[key] ?? "")}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <pre className="result-json">{JSON.stringify(data, null, 2)}</pre>;
}

export default function Home() {
  const [task, setTask] = useState("");
  const [url, setUrl] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [phaseTimes, setPhaseTimes] = useState<Partial<Record<Phase, number>>>({});
  const [script, setScript] = useState("");
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [liveLabel, setLiveLabel] = useState("Awaiting a run");
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repaired, setRepaired] = useState(false);
  const [repairReason, setRepairReason] = useState<string | null>(null);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState(0);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setClock(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (codeRef.current) codeRef.current.scrollTop = codeRef.current.scrollHeight;
  }, [script]);

  const visiblePipeline = useMemo(
    () => PIPELINE.filter((item) => item.phase !== "repairing" || repaired || phase === "repairing"),
    [phase, repaired]
  );

  function reset() {
    setPhase(null);
    setPhaseTimes({});
    setScript("");
    setLiveUrl(null);
    setLiveLabel("Starting");
    setLogs([]);
    setResult(null);
    setUsage(null);
    setError(null);
    setRepaired(false);
    setRepairReason(null);
    setTotalMs(null);
  }

  function handleEvent(event: RunEvent) {
    if (event.t === "phase") {
      setPhase(event.phase);
      setPhaseTimes((current) => ({ ...current, [event.phase]: event.at }));
    } else if (event.t === "live") {
      setLiveUrl(event.url);
      setLiveLabel(event.label);
    } else if (event.t === "plan") {
      setLogs((items) => [...items, event.note]);
    } else if (event.t === "inspect" || event.t === "run") {
      setLogs((items) => [...items, event.msg]);
    } else if (event.t === "step") {
      setLogs((items) => [...items, event.label]);
    } else if (event.t === "script_delta") {
      setScript((current) => current + event.delta);
    } else if (event.t === "script_done") {
      setScript(event.script);
    } else if (event.t === "repair") {
      setRepaired(true);
      setRepairReason(event.reason);
      setScript("");
      setLogs((items) => [...items, `Repair attempt 1: ${event.reason}`]);
    } else if (event.t === "result") {
      setResult(event.result);
      setRepaired(event.repaired);
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
    if (!task.trim() || running) return;
    reset();
    setClock(Date.now());
    setRunning(true);
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: task.trim(),
          url: url.trim() || undefined,
          username: needsLogin ? username : undefined,
          password: needsLogin ? password : undefined,
        }),
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

  async function copyScript() {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadScript() {
    const href = URL.createObjectURL(new Blob([script], { type: "text/typescript" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "automation.ts";
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main>
      <div className="ascii ascii-a" aria-hidden="true">+--+--+{"\n"}| 01  |{"\n"}+--+--+</div>
      <div className="ascii ascii-b" aria-hidden="true">{"/// K3\nHB::RUN\n0001"}</div>

      <header>
        <div className="brand">
          <span className="brand-mark"><Image className="brand-logo" src="/hyperbrowser-symbol.svg" alt="Hyperbrowser" width={104} height={167} priority /></span>
        </div>
        <div className="model-pill"><span className="status-dot" /> MODEL&nbsp; claude-opus-5</div>
      </header>

      <section className="hero">
        <h1>
          Build Browser Agents in{" "}
          <span className="hero-tail">
            Seconds
            <span className="hero-logos">
              <Image className="hero-logo hero-logo-claude" src="/claude-symbol.svg" alt="Claude" width={100} height={100} priority />
              <span className="hero-logo-plus" aria-hidden="true">+</span>
              <Image className="hero-logo hero-logo-hb" src="/hyperbrowser-symbol.svg" alt="Hyperbrowser" width={104} height={167} priority />
            </span>
          </span>
        </h1>
      </section>

      <form className="command" onSubmit={submit}>
        <label htmlFor="task">WEB TASK</label>
        <div className="task-row">
          <textarea id="task" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Get every open engineering role from this careers page" rows={2} required />
          <button type="submit" disabled={running || !task.trim()}><Play size={16} />{running ? "RUNNING" : "BUILD + RUN"}</button>
        </div>
        <div className="form-row">
          <div className="field grow"><label htmlFor="url">TARGET URL <span>OPTIONAL IF INCLUDED ABOVE</span></label><input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
          <label className="check"><input type="checkbox" checked={needsLogin} onChange={(e) => setNeedsLogin(e.target.checked)} /><span>Task needs login</span></label>
        </div>
        <AnimatePresence>
          {needsLogin && (
            <motion.div className="credentials" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="field"><label htmlFor="username">USERNAME</label><input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></div>
              <div className="field"><label htmlFor="password">PASSWORD</label><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
              <p><ShieldCheck size={14} />Passed as runtime environment variables. Never written into the script or persisted.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <section className="workspace">
        <div className="pipeline panel">
          <div className="panel-head"><span>01 / PIPELINE</span><span>{running ? "LIVE" : phase === "done" ? "COMPLETE" : "IDLE"}</span></div>
          <div className="steps">
            {visiblePipeline.map((item, index) => {
              const active = phase === item.phase || (phase === "failed" && item.phase === "done");
              const started = phaseTimes[item.phase];
              const next = visiblePipeline.slice(index + 1).map((nextItem) => phaseTimes[nextItem.phase]).find(Boolean);
              const complete = Boolean(started && next) || (item.phase === "done" && phase === "done");
              return (
                <div className={`step ${active ? "active" : ""} ${complete ? "complete" : ""}`} key={item.phase}>
                  <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="step-label">{complete ? <Check size={14} /> : null}{item.label}</span>
                  <span className="step-time">{started ? elapsed(started, next || clock) : "—"}</span>
                </div>
              );
            })}
          </div>
          <div className="activity">
            <div className="activity-head"><Terminal size={14} />ACTIVITY</div>
            {logs.length ? logs.slice(-7).map((line, index) => <p key={`${line}-${index}`}><span>›</span>{line}</p>) : <p className="muted">Run activity will appear here.</p>}
          </div>
        </div>

        <div className="browser panel">
          <div className="panel-head"><span>02 / LIVE VIEW</span><span>{liveLabel}</span></div>
          <div className="browser-bar"><i /><i /><i /><span>{liveUrl || "hyperbrowser://session"}</span>{liveUrl ? <a href={liveUrl} target="_blank" rel="noreferrer" aria-label="Open Live View"><ExternalLink size={13} /></a> : null}</div>
          <div className="browser-stage">
            {liveUrl ? <iframe src={liveUrl} title="Hyperbrowser Live View" allow="clipboard-read; clipboard-write" /> : <div className="empty-view"><span>HB</span><p>LIVE BROWSER OUTPUT</p></div>}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {(script || result || error) && (
          <motion.section className="outputs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="output panel">
              <div className="panel-head"><span>03 / RESULT</span><span>{result ? `${result.steps.length} STEPS` : "PENDING"}</span></div>
              <div className="output-body">
                {error ? <div className="error-box"><strong>RUN FAILED</strong><p>{error}</p></div> : result ? <ResultView data={result.data} /> : <p className="muted">Waiting for execution.</p>}
                {repairReason ? <div className="repair-box"><strong>REPAIR 1 / 1</strong><p>{repairReason}</p></div> : null}
                {result?.screenshotB64 ? <Image className="final-shot" src={`data:image/png;base64,${result.screenshotB64}`} alt="Final browser state" width={1280} height={720} unoptimized /> : null}
              </div>
              <div className="metrics">
                <span>MODEL <b>claude-opus-5</b></span><span>TOKENS <b>{usage ? `${usage.inputTokens.toLocaleString()} IN / ${usage.outputTokens.toLocaleString()} OUT` : "—"}</b></span>
                <span>MODEL COST <b>{usage ? `$${usage.costUsd.toFixed(4)}${usage.exact ? "" : " EST"}` : "—"}</b></span><span>TIME <b>{totalMs ? `${(totalMs / 1000).toFixed(1)}s` : "—"}</b></span>
                {repaired ? <span>REPAIR <b>1 / 1</b></span> : null}
              </div>
            </div>

            <div className="output panel">
              <div className="panel-head"><span>04 / GENERATED SCRIPT</span><div className="actions"><button onClick={copyScript} disabled={!script}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "COPIED" : "COPY"}</button><button onClick={downloadScript} disabled={!script}><Download size={13} />DOWNLOAD</button></div></div>
              <pre className="code" ref={codeRef}><code>{script || "// K3 is writing..."}</code></pre>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
