"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getIcon, Icons } from "@/lib/icons";

function HbNode({ id, data }: NodeProps) {
  const label = String(data?.label || "");
  const Icon = getIcon(label);
  const canRun = !/^(Start|End|Output)$/.test(label);
  const onRun = (data as { run?: (id: string) => void })?.run;
  const onUpdate = (data as { update?: (id: string, updates: Record<string, unknown>) => void })?.update;
  const params = ((data as { params?: Record<string, unknown> })?.params || {}) as Record<string, unknown>;
  const requiredByType: Record<string, string[]> = { Scrape: ["url"], Extract: ["url"], LLM: ["instruction"], Crawl: ["seedUrls"] };
  const required = requiredByType[label] || [];
  const ready = required.every((k) => {
    const v = params[k];
    return Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim());
  });
  return (
    <div className="bg-white/10 backdrop-blur-md text-white rounded-xl border border-white/20 shadow-sm px-3 py-2 min-w-[260px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" />
          <div className="font-medium text-sm">{label}</div>
        </div>
        {canRun && onRun ? (
          <button disabled={!ready} onClick={() => onRun(id)} className={`px-2 py-0.5 text-[10px] rounded border ${ready ? "border-white/30 bg-white/10 hover:bg-white/20" : "border-white/10 bg-white/5 text-white/50 cursor-not-allowed"}`}>
            Run
          </button>
        ) : null}
      </div>
      {label === "Scrape" && (
        <div className="mt-2">
          <input value={String(params.url || "")} onChange={(e) => onUpdate && onUpdate(id, { url: e.target.value })} placeholder="https://..." className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-xs placeholder-white/40" />
        </div>
      )}
      {label === "LLM" && (
        <div className="mt-2">
          <input value={String(params.instruction || "")} onChange={(e) => onUpdate && onUpdate(id, { instruction: e.target.value })} placeholder="Instruction (e.g., Summarize...)" className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-xs placeholder-white/40" />
        </div>
      )}
      {label === "Crawl" && (
        <div className="mt-2">
          <input value={Array.isArray(params.seedUrls) ? (params.seedUrls as string[]).join(", ") : String(params.seedUrls || "")} onChange={(e) => onUpdate && onUpdate(id, { seedUrls: e.target.value.split(/,\s*/) })} placeholder="Seed URLs, comma-separated" className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-xs placeholder-white/40" />
        </div>
      )}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

type NodeType = "Start" | "Scrape" | "Transform" | "LLM" | "QnAGenerator" | "Extract" | "Crawl" | "Condition" | "While" | "Approval" | "End" | "Output";

export type BuilderNodeData = {
  label: string;
  params?: Record<string, unknown>;
  run?: (id: string) => void;
  update?: (id: string, updates: Record<string, unknown>) => void;
};

export default function BuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BuilderNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [, setLogs] = useState<string[]>([]);
  const [events, setEvents] = useState<Array<{ ts: number; event: string; node?: string; payload?: unknown }>>([]);
  const [nodeStatus, setNodeStatus] = useState<Record<string, "idle" | "running" | "success" | "error">>({});
  const [nodeResult, setNodeResult] = useState<Record<string, unknown>>({});
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [isInteractive, setIsInteractive] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const nextId = useMemo(() => ({ n: 1 }), []);
  const uid = () => `n${nextId.n++}`;

  const onConnect = useCallback<OnConnect>((connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
  }, [setEdges]);

  const fitViewOptions = useMemo(() => ({ padding: 0.2 }), []);

  const addNode = (type: NodeType) => {
    const id = uid();
    const node: Node<BuilderNodeData> = {
      id,
      type: "hb",
      position: { x: 200 + Math.random() * 400, y: 120 + Math.random() * 300 },
      data: {
        label: type,
        params:
          type === "Scrape"
            ? { url: "" }
            : type === "Extract"
            ? { url: "", schema: {} }
            : type === "Crawl"
            ? { seedUrls: [], maxPages: 5 }
            : type === "LLM"
            ? { instruction: "" }
            : type === "Start"
            ? { input: "" }
            : type === "End" || type === "Output"
            ? { filename: "output.json" }
            : {},
        run: runNode,
        update: updateNodeParams,
      },
      style: { color: "#000000" },
    };
    setNodes((prev) => [...prev, node]);
  };

  const updateSelected = (updates: Record<string, unknown>) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedId
          ? {
              ...n,
              data: { ...n.data, params: { ...(n.data?.params || {}), ...updates } },
            }
          : n
      )
    );
  };

  const updateNodeParams = useCallback((id: string, updates: Record<string, unknown>) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, params: { ...(n.data?.params || {}), ...updates } } }
          : n
      )
    );
  }, [setNodes]);

  const runFlow = async () => {
    setLogs([]);
    setNodeResult({});
    setNodeStatus({});
    setEvents([]);
    setWorkflowComplete(false);
    const res = await fetch("/api/run", {
      method: "POST",
      body: JSON.stringify({
        nodes: nodes.map((n) => ({
          id: n.id,
          type: String(n.data?.label || ""),
          // Flatten params onto data so the runner sees root-level fields
          data: { ...(n.data || {}), ...((n.data as { params?: Record<string, unknown> })?.params || {}) },
        })),
        edges,
      }),
    });
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let outputNodeId: string | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.trim()) continue;
        setLogs((l) => [...l, line]);
        try {
          const evt = JSON.parse(line);
          const nodeId = String(evt.node || "");
          setEvents((e) => [...e, { ts: Date.now(), event: evt.event, node: nodeId, payload: evt }]);
          if (evt.event === "start") {
            setNodeStatus((s) => ({ ...s, [nodeId]: "running" }));
            setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, style: { ...n.style, borderColor: "#9ca3af" } } : n)));
          } else if (evt.event === "data") {
            setNodeResult((r) => ({ ...r, [nodeId]: evt.markdown ?? evt.text ?? evt.qna ?? evt.structured ?? evt.input ?? evt }));
          } else if (evt.event === "saved" || evt.event === "end") {
            setNodeStatus((s) => ({ ...s, [nodeId]: s[nodeId] === "error" ? "error" : "success" }));
            setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, style: { ...n.style, borderColor: sColor("success") } } : n)));
            // Track the output node
            if (evt.event === "saved") {
              outputNodeId = nodeId;
            }
          } else if (evt.event === "error") {
            setNodeStatus((s) => ({ ...s, [nodeId]: "error" }));
            setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, style: { ...n.style, borderColor: sColor("error") } } : n)));
          } else if (evt.event === "complete") {
            // Auto-select the output node when workflow completes
            if (outputNodeId) {
              setSelectedId(outputNodeId);
            }
            setWorkflowComplete(true);
          }
        } catch {
          // ignore parse failures
        }
      }
    }
  };

  const runNode = useCallback(async (targetId: string) => {
    setLogs([]);
    setNodeResult({});
    setNodeStatus({});
    setEvents([]);
    const res = await fetch("/api/run", {
      method: "POST",
      body: JSON.stringify({
        nodes: nodes.map((n) => ({
          id: n.id,
          type: String(n.data?.label || ""),
          data: { ...(n.data || {}), ...((n.data as { params?: Record<string, unknown> })?.params || {}) },
        })),
        edges,
        targetNodeId: targetId,
      }),
    });
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.trim()) continue;
        setLogs((l) => [...l, line]);
        try {
          const evt = JSON.parse(line);
          const nodeId = String(evt.node || "");
          setEvents((e) => [...e, { ts: Date.now(), event: evt.event, node: nodeId, payload: evt }]);
        } catch {}
      }
    }
  }, [nodes, edges, setLogs, setNodeResult, setNodeStatus, setEvents]);

  // Load template if provided via query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const template = params.get("template");
    if (!template) return;
    fetch(`/templates.json`)
      .then((r) => r.json())
      .then((all) => {
        const t = (all as Array<{ id: string; nodes: Array<{ id: string; type: string; data?: Record<string, unknown> }>; edges: Array<{ id: string; source: string; target: string }> }>).find((x) => x.id === template);
        if (t) {
          setNodes(
            t.nodes.map((n) => ({
              id: n.id,
              type: "hb",
              position: { x: Math.random() * 400, y: Math.random() * 300 },
              data: { 
                label: `${n.type}`, 
                params: n.data || {},
                run: runNode,
                update: updateNodeParams
              },
              style: { color: "#000000" },
            }))
          );
          setEdges(
            (t.edges || []).map((e, idx: number) => ({
              id: e.id || `e_${e.source}_${e.target}_${idx}`,
              source: e.source,
              target: e.target,
            }))
          );
        }
      })
      .catch(() => void 0);
  }, [runNode, updateNodeParams, setNodes, setEdges]);

  function sColor(status: "running" | "success" | "error") {
    if (status === "running") return "#9ca3af"; // gray-400
    if (status === "success") return "#F0FF26"; // accent
    return "#ef4444"; // red-500
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleInteractive = () => {
    setIsInteractive(!isInteractive);
  };

  const convertToCSV = (data: unknown): string | null => {
    try {
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(","),
          ...data.map((row: Record<string, unknown>) =>
            headers.map((header) => {
              const value = row[header] ?? "";
              const escaped = String(value).replace(/"/g, '""');
              return `"${escaped}"`;
            }).join(",")
          ),
        ];
        return csvRows.join("\n");
      }
      return null;
    } catch {
      return null;
    }
  };

  const downloadResult = (content: string, filename: string, format: "json" | "csv" = "json") => {
    let blob: Blob;
    let finalFilename = filename;
    
    if (format === "csv") {
      try {
        const data = JSON.parse(content);
        const csv = convertToCSV(data);
        if (csv) {
          blob = new Blob([csv], { type: "text/csv" });
          finalFilename = filename.replace(/\.json$/, ".csv");
        } else {
          blob = new Blob([content], { type: "application/json" });
        }
      } catch {
        blob = new Blob([content], { type: "application/json" });
      }
    } else {
      blob = new Blob([content], { type: "application/json" });
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateFromIdea = async () => {
    if (!idea.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const resp = await fetch("/api/generateAgent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea }) });
      const graph = await resp.json();
    const nodesArr = Array.isArray(graph?.nodes) && graph.nodes.length
      ? graph.nodes
      : [
          { id: "s1", type: "Start", data: { input: "" } },
          { id: "n_hb1", type: "Scrape", data: { url: "" } },
          { id: "o1", type: "Output", data: { filename: "output.json" } },
        ];
    const edgesArr = Array.isArray(graph?.edges) && graph.edges.length
      ? graph.edges
      : [
          { id: "e1", source: nodesArr[0].id, target: nodesArr[1].id },
          { id: "e2", source: nodesArr[1].id, target: nodesArr[2].id },
        ];

    setNodes(
      nodesArr.map((n: { id: string; type: string; data?: Record<string, unknown> }) => ({
        id: n.id,
        type: "hb",
        position: { x: 200 + Math.random() * 400, y: 120 + Math.random() * 300 },
        data: { 
          label: n.type, 
          params: n.data || {},
          run: runNode, 
          update: updateNodeParams 
        },
        style: { color: "#000000" },
      }))
    );
    setEdges(
      (edgesArr || []).map((e: { id?: string; source: string; target: string }, idx: number) => ({
        id: e.id || `e_${e.source}_${e.target}_${idx}`,
        source: e.source,
        target: e.target,
      }))
    );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="HyperBuild" className="w-5 h-5" />
          <h1 className="text-lg font-semibold tracking-tight">HyperBuild</h1>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Link href="/" className="px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-900">Templates</Link>
          <button className="px-3 py-1 rounded bg-[#F0FF26] text-black font-medium" onClick={runFlow}>Run</button>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-mono">Powered by</span>
          <a href="https://hyperbrowser.ai" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <img src="/wordmark.svg" alt="Hyperbrowser" className="h-3" />
          </a>
        </div>
      </div>
      {workflowComplete && (
        <div className="mx-auto max-w-7xl px-4 pb-2">
          <div className="px-3 py-2 rounded border border-[#F0FF26] bg-[#F0FF26]/10 text-sm flex items-center justify-between">
            <span>Workflow completed successfully. Results shown in Inspector.</span>
            <button onClick={() => setWorkflowComplete(false)} className="text-xs px-2 py-0.5 rounded border border-white/20 hover:bg-white/10">
              Dismiss
            </button>
          </div>
        </div>
      )}
      <div className={`${isFullscreen ? 'grid grid-cols-1' : 'grid grid-cols-[220px_1fr_340px]'} gap-3 px-4 pb-4 h-[calc(100vh-72px)]`}>
        {!isFullscreen && (
          <aside className="border border-neutral-800 rounded p-2">
            <div className="text-xs text-neutral-400 mb-2">Nodes</div>
            <div className="flex flex-col gap-2">
              {(["Start","Scrape","Transform","LLM","QnAGenerator","Extract","Crawl","Condition","While","Approval","Output","End"] as NodeType[]).map((t) => {
                const Icon = getIcon(t);
                return (
                  <button key={t} className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left flex items-center gap-2" onClick={() => addNode(t)}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
        <div className="relative rounded overflow-hidden text-black border border-neutral-800">
          <button
            onClick={() => setShowMiniMap((v) => !v)}
            className="absolute z-10 top-2 right-2 px-2 py-1 text-xs rounded border border-neutral-700 bg-neutral-900/70 text-white hover:bg-neutral-800"
          >
            {showMiniMap ? "Hide map" : "Show map"}
          </button>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={isInteractive ? onNodesChange : undefined}
            onEdgesChange={isInteractive ? onEdgesChange : undefined}
            onConnect={isInteractive ? onConnect : undefined}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            fitView
            fitViewOptions={fitViewOptions}
            nodeTypes={{ hb: HbNode as React.ComponentType<NodeProps> }}
            nodesDraggable={isInteractive}
            nodesConnectable={isInteractive}
            elementsSelectable={isInteractive}
          >
            <Background />
            <Controls />
            
            {/* Custom control buttons */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button
                onClick={toggleInteractive}
                className="w-8 h-8 bg-neutral-800/80 border border-neutral-600/50 rounded flex items-center justify-center text-white hover:bg-neutral-700/90 transition-colors"
                title={isInteractive ? "Lock nodes" : "Unlock nodes"}
              >
                {isInteractive ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="m7 11V7a5 5 0 0 1 9.9-1"/>
                  </svg>
                )}
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="w-8 h-8 bg-neutral-800/80 border border-neutral-600/50 rounded flex items-center justify-center text-white hover:bg-neutral-700/90 transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
                    <path d="m3 3 5 5"/>
                    <path d="M8 21v-3a2 2 0 0 1 2-2h3"/>
                    <path d="m21 21-5-5"/>
                    <path d="M21 12h-3a2 2 0 0 1-2-2V7"/>
                    <path d="m21 3-5 5"/>
                    <path d="M3 12h3a2 2 0 0 0 2-2V7"/>
                    <path d="m3 21 5-5"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m16 13 5-5 0 0-5-5"/>
                    <path d="m21 8-7 0"/>
                    <path d="m8 11-5 5 0 0 5 5"/>
                    <path d="m3 16 7 0"/>
                  </svg>
                )}
              </button>
            </div>
            {showMiniMap ? <MiniMap pannable zoomable /> : null}
            {/* inline overlays disabled: previews render inside nodes when enabled */}
          </ReactFlow>
        </div>
        {!isFullscreen && (
          <aside className="flex flex-col gap-3">
          <div className="border border-neutral-800 rounded p-3">
            <div className="text-xs text-neutral-400 mb-2">Inspector</div>
            {selectedId ? (
              (() => {
                const n = nodes.find((x) => x.id === selectedId);
                const type = String(n?.data?.label || "");
                const p = (n?.data?.params as Record<string, unknown>) || {};
                if (!n) return <div className="text-sm text-neutral-400">Select a node</div>;
                return (
                  <div className="space-y-2 text-sm">
                    <div className="text-neutral-300">{type}</div>
                    {type === "Start" && (
                      <label className="block">
                        <div className="text-xs text-neutral-400">Input (JSON)</div>
                        <textarea
                          value={typeof p.input === "string" ? p.input : JSON.stringify(p.input || {}, null, 2)}
                          onChange={(e) => updateSelected({ input: e.target.value })}
                          rows={6}
                          className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800 font-mono text-xs"
                        />
                      </label>
                    )}
                    {type === "Scrape" && (
                      <label className="block">
                        <div className="text-xs text-neutral-400">URL</div>
                        <input
                          value={String(p.url || "")}
                          onChange={(e) => updateSelected({ url: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800"
                        />
                      </label>
                    )}
                    {type === "Extract" && (
                      <>
                        <label className="block">
                          <div className="text-xs text-neutral-400">URL</div>
                          <input value={String(p.url || "")} onChange={(e) => updateSelected({ url: e.target.value })} className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800" />
                        </label>
                        <label className="block">
                          <div className="text-xs text-neutral-400">Schema (JSON)</div>
                          <textarea
                            value={p.schema ? JSON.stringify(p.schema, null, 2) : "{}"}
                            onChange={(e) => {
                              try { updateSelected({ schema: JSON.parse(e.target.value || "{}") }); } catch { /* ignore */ }
                            }}
                            rows={6}
                            className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800 font-mono text-xs"
                          />
                        </label>
                      </>
                    )}
                    {type === "Crawl" && (
                      <>
                        <label className="block">
                          <div className="text-xs text-neutral-400">Seed URLs (comma separated)</div>
                          <input
                            value={String(Array.isArray(p.seedUrls) ? p.seedUrls.join(", ") : p.seedUrls || "")}
                            onChange={(e) => updateSelected({ seedUrls: e.target.value.split(/,\s*/) })}
                            className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800"
                          />
                        </label>
                        <label className="block">
                          <div className="text-xs text-neutral-400">Max pages</div>
                          <input type="number" value={String(p.maxPages ?? "")} onChange={(e) => updateSelected({ maxPages: Number(e.target.value || 0) || undefined })} className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800" />
                        </label>
                      </>
                    )}
                    {type === "Condition" && (
                      <label className="block">
                        <div className="text-xs text-neutral-400">Expression (uses &apos;input&apos;)</div>
                        <input value={String(p.condition || "")} onChange={(e) => updateSelected({ condition: e.target.value })} placeholder="input.includes('finance')" className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800" />
                      </label>
                    )}
                    {type === "While" && (
                      <label className="block">
                        <div className="text-xs text-neutral-400">Loop while (uses &apos;input&apos;)</div>
                        <input value={String(p.condition || "")} onChange={(e) => updateSelected({ condition: e.target.value })} placeholder="input.length < 1000" className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800" />
                      </label>
                    )}
                    {type === "Approval" && (
                      <div className="text-xs text-neutral-400">Manual approval (auto-approved in MVP)</div>
                    )}
                    {type === "LLM" && (
                      <label className="block">
                        <div className="text-xs text-neutral-400">Instruction</div>
                        <input
                          value={String(p.instruction || "")}
                          onChange={(e) => updateSelected({ instruction: e.target.value })}
                          placeholder="Summarize..."
                          className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800"
                        />
                      </label>
                    )}
                    {(type === "Output" || type === "End") && (
                      <label className="block">
                        <div className="text-xs text-neutral-400">Filename</div>
                        <input
                          value={String(p.filename || "output.json")}
                          onChange={(e) => updateSelected({ filename: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800"
                        />
                      </label>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="text-sm text-neutral-400">Select a node to edit</div>
            )}
          </div>
          {selectedId && nodeResult[selectedId] !== undefined && (
            <div className="border border-neutral-800 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-neutral-400">Result</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const content =
                        typeof nodeResult[selectedId] === "string"
                          ? nodeResult[selectedId]
                          : JSON.stringify(nodeResult[selectedId], null, 2);
                      copyToClipboard(content);
                    }}
                    className="px-2 py-0.5 text-[10px] rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => {
                      const content =
                        typeof nodeResult[selectedId] === "string"
                          ? nodeResult[selectedId]
                          : JSON.stringify(nodeResult[selectedId], null, 2);
                      const n = nodes.find((x) => x.id === selectedId);
                      const filename = ((n?.data?.params as Record<string, unknown>)?.filename || "output.json") as string;
                      downloadResult(content, filename, "json");
                    }}
                    className="px-2 py-0.5 text-[10px] rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                  >
                    JSON
                  </button>
                  {(() => {
                    try {
                      const data = typeof nodeResult[selectedId] === "string" 
                        ? JSON.parse(nodeResult[selectedId]) 
                        : nodeResult[selectedId];
                      return Array.isArray(data) && data.length > 0 ? (
                        <button
                          onClick={() => {
                            const content =
                              typeof nodeResult[selectedId] === "string"
                                ? nodeResult[selectedId]
                                : JSON.stringify(nodeResult[selectedId], null, 2);
                            const n = nodes.find((x) => x.id === selectedId);
                            const filename = ((n?.data?.params as Record<string, unknown>)?.filename || "output.json") as string;
                            downloadResult(content, filename, "csv");
                          }}
                          className="px-2 py-0.5 text-[10px] rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                        >
                          CSV
                        </button>
                      ) : null;
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              </div>
              <div className="relative">
                <pre className="w-full px-2 py-2 rounded bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-200 overflow-auto max-h-[200px] whitespace-pre-wrap break-words">
                  {typeof nodeResult[selectedId] === "string"
                    ? nodeResult[selectedId].slice(0, 5000)
                    : JSON.stringify(nodeResult[selectedId], null, 2).slice(0, 5000)}
                </pre>
              </div>
            </div>
          )}
          {selectedId && nodeResult[selectedId] === undefined && nodeStatus[selectedId] !== "running" && (
            <div className="border border-neutral-800 rounded p-3">
              <div className="text-xs text-neutral-400 mb-2">Result</div>
              <div className="text-xs text-neutral-500">Run this node to see results</div>
            </div>
          )}
          <div className="border border-neutral-800 rounded p-3 overflow-auto max-h-[30vh]">
            <div className="text-xs text-neutral-400 mb-2">Execution Log</div>
            <div className="space-y-2 text-xs">
              {selectedId && events.filter((e) => e.node === selectedId).length > 0 ? (
                events
                  .filter((e) => e.node === selectedId)
                  .map((e, i) => (
                    <div key={i} className="border border-neutral-800 rounded p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-neutral-300">{e.event}</div>
                        <div className="text-neutral-500">{new Date(e.ts).toLocaleTimeString()}</div>
                      </div>
                      {e.payload ? (
                        <pre className="mt-1 whitespace-pre-wrap break-words text-neutral-400">
                          {JSON.stringify(e.payload, null, 2).slice(0, 800)}
                        </pre>
                      ) : null}
                    </div>
                  ))
              ) : (
                <div className="text-xs text-neutral-500">No execution logs yet</div>
              )}
            </div>
          </div>
        </aside>
        )}
      </div>
      
      {/* Bottom Generate Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-xl p-2 shadow-2xl">
          <div className="relative flex items-center">
            <Icons.Generate className="absolute left-2 w-3 h-3 text-neutral-400" />
            <input
              type="search"
              name="search-query-agent-description"
              id="agent-description-input"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your agent..."
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="search"
              data-lpignore="true"
              data-1p-ignore="true"
              role="searchbox"
              aria-label="Agent description"
              className="w-[280px] pl-7 pr-3 py-1.5 rounded-md border border-neutral-700 bg-neutral-950/80 text-sm placeholder-neutral-500 focus:outline-none focus:border-[#F0FF26]/50 overflow-hidden resize-none"
              style={{ 
                textOverflow: 'ellipsis', 
                WebkitAppearance: 'none'
              } as React.CSSProperties}
            />
          </div>
          <button 
            className={`px-3 py-1.5 rounded-md border border-neutral-700 text-sm font-medium transition-all flex items-center gap-2 ${
              isGenerating 
                ? 'bg-neutral-800 cursor-not-allowed' 
                : 'hover:bg-neutral-800'
            }`}
            onClick={generateFromIdea}
            disabled={isGenerating}
          >
            {isGenerating && (
              <div className="w-3 h-3 border border-neutral-500 border-t-white rounded-full animate-spin" />
            )}
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}


