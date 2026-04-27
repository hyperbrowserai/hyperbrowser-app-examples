"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import InputSection from "@/components/input-section";
import BatchInputSection from "@/components/batch-input-section";
import BatchResultsSection from "@/components/batch-results-section";
import PreviewSection from "@/components/preview-section";
import SkillTreeOutput from "@/components/skill-tree/skill-tree-output";
import AutoLiveBrowser from "@/components/auto-mode/auto-live-browser";
import AutoSkillPreview from "@/components/auto-mode/auto-skill-preview";
import GraphView from "@/components/skill-tree/graph-view";
import {
  GenerateResponse,
  BatchResult,
  SkillTreeResult,
  SkillTreeStreamEvent,
  AutoModeStreamEvent,
  AutoDiscoveryNode,
  AutoModePhase,
} from "@/types";
import { Key, Zap, List, GitBranch, Eye, Play } from "lucide-react";

type Mode = "single" | "batch" | "tree" | "vision" | "auto";

function parseAutoSSE(chunk: string): AutoModeStreamEvent[] {
  const events: AutoModeStreamEvent[] = [];
  const lines = chunk.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        events.push(JSON.parse(line.slice(6)) as AutoModeStreamEvent);
      } catch {
        // skip malformed
      }
    }
  }
  return events;
}

function parseSkillTreeSSE(chunk: string): SkillTreeStreamEvent[] {
  const events: SkillTreeStreamEvent[] = [];
  const lines = chunk.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        events.push(JSON.parse(line.slice(6)) as SkillTreeStreamEvent);
      } catch {
        // skip malformed
      }
    }
  }
  return events;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("single");
  const [topic, setTopic] = useState("");
  const [treeTopic, setTreeTopic] = useState("");
  const [visionUrl, setVisionUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [skillTreeResult, setSkillTreeResult] = useState<SkillTreeResult | null>(null);
  const [skillTreeStreamComplete, setSkillTreeStreamComplete] = useState(true);
  const [treeLiveUrl, setTreeLiveUrl] = useState<string | null>(null);
  const [treeCurrentUrl, setTreeCurrentUrl] = useState("");
  const [treeDiscovery, setTreeDiscovery] = useState<AutoDiscoveryNode[]>([]);
  const [treeAgentStatus, setTreeAgentStatus] = useState("");
  const [treePhase, setTreePhase] = useState<"idle" | "searching" | "browsing" | "generating" | "complete" | "error">("idle");
  const [visionScreenshots, setVisionScreenshots] = useState<string[]>([]);
  const [error, setError] = useState("");

  const [autoTopic, setAutoTopic] = useState("");
  const [autoPhase, setAutoPhase] = useState<AutoModePhase>("idle");
  const [autoLiveUrl, setAutoLiveUrl] = useState<string | null>(null);
  const [autoCurrentUrl, setAutoCurrentUrl] = useState("");
  const [autoSkillResult, setAutoSkillResult] = useState<SkillTreeResult | null>(null);
  const [autoSkillStreamComplete, setAutoSkillStreamComplete] = useState(true);
  const [autoSelectedFile, setAutoSelectedFile] = useState<string>("");
  const [autoDiscovery, setAutoDiscovery] = useState<AutoDiscoveryNode[]>([]);
  const [autoAgentStatus, setAutoAgentStatus] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);
  const autoRunIdRef = useRef<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedContent("");
    setVisionScreenshots([]);

    try {
      const isUrl = topic.startsWith("http://") || topic.startsWith("https://");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [isUrl ? "url" : "topic"]: topic,
        }),
      });

      const data: GenerateResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate SKILL.md");
      }

      setGeneratedContent(data.content);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error("Error generating skill:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    const urls = batchUrls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && (line.startsWith("http://") || line.startsWith("https://")));

    if (urls.length === 0) {
      setError("Please enter at least one valid URL");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedContent("");
    setVisionScreenshots([]);
    
    // Initialize results with processing status
    const initialResults: BatchResult[] = urls.map((url) => ({
      url,
      content: "",
      status: "processing",
    }));
    setBatchResults(initialResults);

    try {
      // Use Hyperbrowser's native batch API via our batch endpoint
      const response = await fetch("/api/generate-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate skills");
      }

      // Update results with the batch response
      const finalResults: BatchResult[] = data.results.map((result: BatchResult) => ({
        url: result.url,
        content: result.content || "",
        status: result.success ? "success" as const : "error" as const,
        error: result.error,
        duration: result.duration,
      }));

      setBatchResults(finalResults);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      
      // Update all to error status
      setBatchResults((prev) =>
        prev.map((r) => ({ ...r, status: "error" as const, error: errorMessage }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (result: BatchResult) => {
    setGeneratedContent(result.content || "");
    // Scroll to preview
    setTimeout(() => {
      const previewElement = document.querySelector('[data-preview]');
      if (previewElement) {
        previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleTreeGenerate = async () => {
    if (!treeTopic.trim()) return;

    setLoading(true);
    setError("");
    setSkillTreeResult(null);
    setSkillTreeStreamComplete(false);
    setVisionScreenshots([]);
    setTreeLiveUrl(null);
    setTreeCurrentUrl("");
    setTreeDiscovery([]);
    setTreeAgentStatus("");
    setTreePhase("searching");
    setLoadingStage("Searching documentation...");

    const isUrl =
      treeTopic.startsWith("http://") || treeTopic.startsWith("https://");

    try {
      const response = await fetch("/api/skill-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [isUrl ? "url" : "topic"]: treeTopic,
        }),
      });

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => "");
        throw new Error(
          errText || `Failed to start skill tree stream (${response.status})`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const events = parseSkillTreeSSE(part + "\n\n");
          for (const event of events) {
            switch (event.type) {
              case "phase":
                setTreePhase(event.phase);
                if (event.phase === "searching") {
                  setLoadingStage("Searching documentation...");
                } else if (event.phase === "browsing") {
                  setLoadingStage("");
                  setLoading(false);
                } else if (event.phase === "generating") {
                  setLoadingStage("");
                }
                break;
              case "session_started":
                setTreeLiveUrl(event.liveUrl);
                setLoading(false);
                setLoadingStage("");
                break;
              case "navigating":
                setTreeCurrentUrl(event.url);
                setTreeDiscovery((prev) => {
                  if (prev.some((n) => n.url === event.url)) return prev;
                  let title = event.url;
                  try { title = new URL(event.url).hostname.replace("www.", ""); } catch { /* keep raw */ }
                  return [...prev, { id: `nav-${prev.length}`, url: event.url, title, timestamp: Date.now() }];
                });
                break;
              case "extracting":
                setTreeCurrentUrl(event.url);
                setTreeDiscovery((prev) => {
                  const exists = prev.find((n) => n.url === event.url);
                  if (exists && exists.title !== event.pageTitle) {
                    return prev.map((n) => n.url === event.url ? { ...n, title: event.pageTitle } : n);
                  }
                  if (!exists) {
                    return [...prev, { id: `ext-${prev.length}`, url: event.url, title: event.pageTitle, timestamp: Date.now() }];
                  }
                  return prev;
                });
                break;
              case "agent_status":
                setTreeAgentStatus(event.message);
                break;
              case "tree_topic":
                setTreePhase("generating");
                setSkillTreeResult({ topic: event.topic, files: [] });
                break;
              case "skill_generated":
                setSkillTreeResult((prev) => {
                  if (!prev) return { topic: "", files: [event.file] };
                  if (prev.files.some((f) => f.path === event.file.path)) return prev;
                  return { ...prev, files: [...prev.files, event.file] };
                });
                break;
              case "complete":
                setSkillTreeResult(event.tree);
                setTreePhase("complete");
                break;
              case "error":
                setError(event.message);
                setTreePhase("error");
                break;
              default:
                break;
            }
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      setTreePhase("error");
      console.error("Error generating skill tree:", err);
    } finally {
      setLoading(false);
      setLoadingStage("");
      setSkillTreeStreamComplete(true);
    }
  };

  const handleAutoStop = () => {
    const id = autoRunIdRef.current;
    if (id) {
      void fetch("/api/auto-mode/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: id }),
      });
    }
  };

  const handleAutoGenerate = async () => {
    const trimmed = autoTopic.trim();
    if (!trimmed) return;

    setAutoLoading(true);
    setError("");
    setAutoSkillResult(null);
    setAutoSkillStreamComplete(false);
    setAutoSelectedFile("");
    setAutoLiveUrl(null);
    setAutoCurrentUrl("");
    setAutoDiscovery([]);
    setAutoAgentStatus("");
    setAutoPhase("searching");
    autoRunIdRef.current = null;

    const isUrl =
      trimmed.startsWith("http://") || trimmed.startsWith("https://");

    try {
      const response = await fetch("/api/auto-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isUrl ? { url: trimmed } : { topic: trimmed }),
      });

      if (!response.ok || !response.body) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const events = parseAutoSSE(part + "\n\n");
          for (const event of events) {
            switch (event.type) {
              case "run_started":
                autoRunIdRef.current = event.runId;
                break;
              case "phase":
                setAutoPhase(event.phase);
                break;
              case "session_started":
                setAutoLiveUrl(event.liveUrl);
                break;
              case "search_complete":
                setAutoPhase("browsing");
                break;
              case "navigating":
                setAutoCurrentUrl(event.url);
                setAutoDiscovery((prev) => {
                  if (prev.some((n) => n.url === event.url)) return prev;
                  let title = event.url;
                  try {
                    title = new URL(event.url).hostname.replace("www.", "");
                  } catch {
                    /* keep raw */
                  }
                  return [
                    ...prev,
                    {
                      id: `nav-${prev.length}`,
                      url: event.url,
                      title,
                      timestamp: Date.now(),
                    },
                  ];
                });
                break;
              case "extracting":
                setAutoCurrentUrl(event.url);
                setAutoDiscovery((prev) => {
                  const existing = prev.find((n) => n.url === event.url);
                  if (existing && existing.title !== event.pageTitle) {
                    return prev.map((n) =>
                      n.url === event.url
                        ? { ...n, title: event.pageTitle }
                        : n
                    );
                  }
                  if (!existing) {
                    return [
                      ...prev,
                      {
                        id: `ext-${prev.length}`,
                        url: event.url,
                        title: event.pageTitle,
                        timestamp: Date.now(),
                      },
                    ];
                  }
                  return prev;
                });
                break;
              case "agent_status":
                setAutoAgentStatus(event.message);
                break;
              case "skill_tree_topic":
                // Don't change phase here — just initialise the result container.
                // The phase stays "browsing" until the server sends phase:"generating".
                setAutoSkillResult({ topic: event.topic, files: [] });
                break;
              case "skill_file":
                setAutoSkillResult((prev) => {
                  if (!prev) return { topic: "", files: [event.file] };
                  if (prev.files.some((f) => f.path === event.file.path)) return prev;
                  return { ...prev, files: [...prev.files, event.file] };
                });
                // Auto-select first file so the bottom panel has something to show
                setAutoSelectedFile((cur) => cur || event.file.path);
                break;
              case "stopped_early":
                setAutoAgentStatus(event.message);
                break;
              case "complete":
                // Merge with any files already streamed — don't overwrite them
                setAutoSkillResult((prev) => {
                  const incoming = event.tree;
                  if (!prev) return incoming;
                  const merged = [...prev.files];
                  for (const f of incoming.files) {
                    if (!merged.some((e) => e.path === f.path) && f.content) {
                      merged.push(f);
                    }
                  }
                  return { topic: incoming.topic || prev.topic, files: merged };
                });
                setAutoSkillStreamComplete(true);
                setAutoPhase("complete");
                break;
              case "error":
                setError(event.message);
                setAutoPhase("error");
                break;
              default:
                break;
            }
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      setAutoPhase("error");
      setAutoSkillStreamComplete(true);
      console.error("Auto mode error:", err);
    } finally {
      setAutoLoading(false);
      setAutoSkillStreamComplete(true);
    }
  };

  const handleVisionGenerate = async () => {
    const trimmedUrl = visionUrl.trim();
    if (!trimmedUrl) return;

    if (
      !trimmedUrl.startsWith("http://") &&
      !trimmedUrl.startsWith("https://")
    ) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedContent("");
    setSkillTreeResult(null);
    setVisionScreenshots([]);
    setLoadingStage("Screenshotting page...");

    const analyzingStageTimer = setTimeout(() => {
      setLoadingStage("Analyzing with Opus 4.7...");
    }, 1400);

    try {
      const response = await fetch("/api/generate-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate SKILL.md");
      }

      const skillResponse = data as GenerateResponse;
      setGeneratedContent(skillResponse.content);

      setVisionScreenshots(Array.isArray(data.screenshots) ? data.screenshots : []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error("Error generating vision skill:", err);
    } finally {
      clearTimeout(analyzingStageTimer);
      setLoading(false);
      setLoadingStage("");
    }
  };

  const handleModeSwitch = (newMode: Mode) => {
    if (newMode !== "auto") {
      setAutoPhase("idle");
      setAutoSkillResult(null);
      setAutoSkillStreamComplete(true);
      setAutoSelectedFile("");
      setAutoLiveUrl(null);
      setAutoCurrentUrl("");
      setAutoDiscovery([]);
      setAutoAgentStatus("");
      setAutoLoading(false);
      autoRunIdRef.current = null;
    }
    setMode(newMode);
    setError("");
    setGeneratedContent("");
    setVisionUrl("");
    setVisionScreenshots([]);
    setBatchResults([]);
    setSkillTreeResult(null);
    setSkillTreeStreamComplete(true);
    setTreeLiveUrl(null);
    setTreeCurrentUrl("");
    setTreeDiscovery([]);
    setTreeAgentStatus("");
    setTreePhase("idle");
    setLoadingStage("");
  };

  const showAutoWorkspace =
    mode === "auto" && autoPhase !== "idle";

  return (
    <main className="min-h-screen bg-[#fafafa] bg-[url('/grid.svg')] text-black font-sans selection:bg-black selection:text-white pb-24 relative">
      
      {/* Navbar CTA */}
      <div className="absolute top-6 right-6 z-50">
        <a 
          href="https://hyperbrowser.ai" 
          target="_blank" 
          className="group flex items-center gap-2 bg-black text-white px-4 py-2 font-bold text-sm uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all shadow-brutal-sm hover:shadow-brutal hover:-translate-y-0.5"
        >
          <Key size={16} strokeWidth={2.5} />
          <span>Get API Key</span>
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
        
        {/* Header */}
        <header className="flex flex-col items-center mb-16 relative">
          <div className="mb-8">
            <Image
              src="/logo.svg"
              alt="HyperSkill Logo"
              width={60}
              height={96}
              className="text-black"
              priority
            />
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-center leading-[0.9]">
            HYPER<span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-black">SKILL</span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-gray-500 max-w-2xl text-center leading-tight">
            Auto-generate <span className="text-black font-bold bg-gray-200 px-1">SKILL.md</span> documentation for your AI agents from any web source.
          </p>
          
          <div className="mt-6 text-sm font-bold uppercase tracking-widest text-gray-400">
            Built with <a href="https://hyperbrowser.ai" target="_blank" className="text-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white transition-all px-1">Hyperbrowser</a>
          </div>
        </header>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8 px-2">
          <div className="inline-flex flex-wrap justify-center border-4 border-black shadow-brutal bg-white max-w-full">
            <button
              onClick={() => handleModeSwitch("single")}
              className={`px-8 py-4 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                mode === "single"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <Zap size={18} strokeWidth={2.5} />
              Single Skill
            </button>
            <div className="w-[4px] bg-black" />
            <button
              onClick={() => handleModeSwitch("batch")}
              className={`px-8 py-4 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                mode === "batch"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <List size={18} strokeWidth={2.5} />
              Batch Mode
            </button>
            <div className="w-[4px] bg-black" />
            <button
              onClick={() => handleModeSwitch("tree")}
              className={`px-8 py-4 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                mode === "tree"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <GitBranch size={18} strokeWidth={2.5} />
              Skill Tree
            </button>
            <div className="w-[4px] bg-black" />
            <button
              onClick={() => handleModeSwitch("vision")}
              className={`px-8 py-4 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                mode === "vision"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <Eye size={18} strokeWidth={2.5} />
              Vision Mode
            </button>
            <div className="w-full h-[4px] bg-black sm:w-[4px] sm:h-auto shrink-0" />
            <button
              onClick={() => handleModeSwitch("auto")}
              className={`px-8 py-4 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                mode === "auto"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <Play size={18} strokeWidth={2.5} />
              Auto
            </button>
          </div>
        </div>

        {/* Input Section - Conditional based on mode */}
        <div className="mb-20">
          {mode === "single" ? (
            <InputSection
              value={topic}
              onChange={setTopic}
              onGenerate={handleGenerate}
              loading={loading}
            />
          ) : mode === "batch" ? (
            <BatchInputSection
              value={batchUrls}
              onChange={setBatchUrls}
              onGenerate={handleBatchGenerate}
              loading={loading}
            />
          ) : mode === "vision" ? (
            <InputSection
              value={visionUrl}
              onChange={setVisionUrl}
              onGenerate={handleVisionGenerate}
              loading={loading}
              placeholder="Enter a URL to generate output from visual analysis..."
              helperText="Vision mode (screenshot + Opus 4.7)"
              loadingText="Analyzing"
            />
          ) : mode === "auto" ? (
            <InputSection
              value={autoTopic}
              onChange={setAutoTopic}
              onGenerate={handleAutoGenerate}
              loading={autoLoading}
              onStop={handleAutoStop}
              placeholder="Topic (e.g. stripe payments) or paste a docs URL..."
              helperText="Autonomous browser agent + live skill tree"
              loadingText="Researching"
            />
          ) : (
            <InputSection
              value={treeTopic}
              onChange={setTreeTopic}
              onGenerate={handleTreeGenerate}
              loading={loading}
            />
          )}
        </div>

        {showAutoWorkspace && (
          <div className="space-y-6 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Top row: browser | graph view (side by side, fixed height) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[680px]">
              {/* Left — live browser */}
              <div className="h-full min-h-0">
                <AutoLiveBrowser
                  liveUrl={autoLiveUrl}
                  currentUrl={autoCurrentUrl}
                  phase={autoPhase}
                  topic={autoTopic}
                  discoveryNodes={autoDiscovery}
                  agentStatus={autoAgentStatus}
                />
              </div>

              {/* Right — research log during browsing, D3 graph once files arrive */}
              <div className="h-full min-h-0">
                {autoSkillResult && autoSkillResult.files.length > 0 ? (
                  <div className="flex flex-col h-full border-4 border-black shadow-brutal bg-white overflow-hidden">
                    {/* Graph title bar */}
                    <div className="bg-black text-white px-4 py-3 flex items-center justify-between gap-3 border-b-4 border-black shrink-0">
                      <div className="flex items-center gap-2 font-mono text-sm text-gray-400 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                        <span className="ml-2 truncate">
                          {autoSkillResult.topic || autoTopic} · {autoSkillResult.files.length} nodes
                        </span>
                      </div>
                      {!autoSkillStreamComplete && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 shrink-0">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
                          </span>
                          Building
                        </span>
                      )}
                    </div>
                    {/* Graph fills the rest */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <GraphView
                        files={autoSkillResult.files}
                        selectedFile={autoSelectedFile}
                        onSelectFile={(path) => {
                          setAutoSelectedFile(path);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <AutoSkillPreview
                    topic={autoTopic}
                    phase={autoPhase}
                    discoveryNodes={autoDiscovery}
                    agentStatus={autoAgentStatus}
                    skillResult={autoSkillResult}
                    streamComplete={autoSkillStreamComplete}
                  />
                )}
              </div>
            </div>

            {/* Bottom — file explorer + viewer only (graph is already shown above) */}
            {autoSkillResult && autoSkillResult.files.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SkillTreeOutput
                  result={autoSkillResult}
                  streamComplete={autoSkillStreamComplete}
                  hideGraphTab
                />
              </div>
            )}
          </div>
        )}

        {/* Loading Stage Indicator (Vision only — tree uses split layout) */}
        {mode === "vision" && loading && loadingStage && (
          <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-4 border-black bg-white p-6 shadow-brutal flex items-center gap-4">
              <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-lg">{loadingStage}</p>
            </div>
          </div>
        )}

        {/* Skill Tree — searching spinner before browser session starts */}
        {mode === "tree" && loading && loadingStage && treePhase === "searching" && (
          <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-4 border-black bg-white p-6 shadow-brutal flex items-center gap-4">
              <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-lg">{loadingStage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-4 border-black bg-red-50 p-6 shadow-brutal flex items-start gap-4">
              <div className="bg-black text-white px-2 py-0.5 font-bold text-xs uppercase shrink-0 mt-1">Error</div>
              <p className="font-bold text-lg leading-tight">{error}</p>
            </div>
          </div>
        )}

        {/* Batch Results Section */}
        {mode === "batch" && batchResults.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <BatchResultsSection results={batchResults} onPreview={handlePreview} />
          </div>
        )}

        {/* Preview Section */}
        {generatedContent &&
          (mode === "single" || mode === "batch" || mode === "vision") && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700" data-preview>
            <PreviewSection
              content={generatedContent}
              screenshots={mode === "vision" ? visionScreenshots : []}
            />
          </div>
        )}

        {/* Skill Tree — live split view (same pattern as HyperLearn) */}
        {mode === "tree" && treePhase !== "idle" && treePhase !== "searching" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Browsing OR generating before files arrive: fixed-height split */}
            {!skillTreeResult && (treePhase === "browsing" || treePhase === "generating") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[680px]">
                <div className="h-full min-h-0">
                  <AutoLiveBrowser
                    liveUrl={treeLiveUrl}
                    currentUrl={treeCurrentUrl}
                    phase={treePhase}
                    topic={treeTopic}
                    discoveryNodes={treeDiscovery}
                    agentStatus={treeAgentStatus}
                  />
                </div>
                <div className="h-full min-h-0 flex flex-col items-center justify-center border-4 border-black shadow-brutal bg-white gap-4">
                  <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
                  <p className="font-bold text-sm uppercase tracking-wider text-gray-600">
                    {treePhase === "generating" ? "BUILDING SKILL TREE..." : "AGENT IS READING..."}
                  </p>
                  {treeDiscovery.length > 0 && treePhase === "browsing" && (
                    <p className="font-mono text-xs text-gray-400 uppercase tracking-wide">
                      {treeDiscovery.length} page{treeDiscovery.length !== 1 ? "s" : ""} visited
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Files arriving: fixed-height split above, tree explorer below */}
            {skillTreeResult && (treePhase === "generating" || treePhase === "browsing") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[340px]">
                <div className="h-full min-h-0">
                  <AutoLiveBrowser
                    liveUrl={treeLiveUrl}
                    currentUrl={treeCurrentUrl}
                    phase="generating"
                    topic={treeTopic}
                    discoveryNodes={treeDiscovery}
                    agentStatus={treeAgentStatus}
                  />
                </div>
                <div className="h-full min-h-0 flex flex-col items-center justify-center border-4 border-black shadow-brutal bg-white gap-3 px-6 text-center">
                  <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
                  <p className="font-bold text-sm uppercase tracking-wider text-gray-600">
                    {skillTreeResult.files.length} file{skillTreeResult.files.length !== 1 ? "s" : ""} — streaming
                  </p>
                </div>
              </div>
            )}

            {/* Tree explorer — appears as soon as files arrive, stays through complete */}
            {skillTreeResult && (
              <SkillTreeOutput
                result={skillTreeResult}
                streamComplete={skillTreeStreamComplete}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
