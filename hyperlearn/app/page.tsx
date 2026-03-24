"use client";

import { useState, useCallback, useRef } from "react";
import { Key } from "lucide-react";
import {
  SkillTreeFile,
  SkillTreeResult,
  BrowseEvent,
  GenerationStatus,
  DiscoveryNode,
} from "@/lib/types";
import Header from "@/components/Header";
import InputBar from "@/components/InputBar";
import LiveBrowserView from "@/components/LiveBrowserView";
import SkillTreePanel from "@/components/SkillTreePanel";

function parseSSEEvents(chunk: string): BrowseEvent[] {
  const events: BrowseEvent[] = [];
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        const data = JSON.parse(line.slice(6));
        events.push(data as BrowseEvent);
      } catch {
        // Skip malformed events
      }
    }
  }

  return events;
}

export default function Home() {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [topic, setTopic] = useState("");
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [files, setFiles] = useState<SkillTreeFile[]>([]);
  const [tree, setTree] = useState<SkillTreeResult | null>(null);
  const [discoveryNodes, setDiscoveryNodes] = useState<DiscoveryNode[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startGeneration = useCallback(async (input: string) => {
    // Reset state
    setStatus("browsing");
    setTopic(input);
    setLiveUrl(null);
    setCurrentUrl("");
    setFiles([]);
    setTree(null);
    setDiscoveryNodes([]);
    setErrorMessage(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const isUrl =
        input.startsWith("http://") || input.startsWith("https://");
      const body = isUrl ? { url: input } : { topic: input };

      const response = await fetch("/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error || `Request failed with status ${response.status}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (ending with \n\n)
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const events = parseSSEEvents(part + "\n\n");
          for (const event of events) {
            switch (event.type) {
              case "session_started":
                setLiveUrl(event.liveUrl);
                break;

              case "navigating":
                setCurrentUrl(event.url);
                setDiscoveryNodes((prev) => {
                  if (prev.some((n) => n.url === event.url)) return prev;
                  return [
                    ...prev,
                    {
                      id: `nav-${prev.length}`,
                      url: event.url,
                      title: new URL(event.url).hostname.replace("www.", ""),
                      timestamp: Date.now(),
                    },
                  ];
                });
                break;

              case "extracting":
                setCurrentUrl(event.url);
                setDiscoveryNodes((prev) => {
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

              case "generating_skills":
                setStatus("generating");
                break;

              case "skill_generated":
                setFiles((prev) => {
                  const exists = prev.some(
                    (f) => f.path === event.file.path
                  );
                  if (exists) return prev;
                  return [...prev, event.file];
                });
                break;

              case "complete":
                setTree(event.tree);
                setStatus("complete");
                break;

              case "error":
                setErrorMessage(event.message);
                setStatus("error");
                break;
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMessage(message);
      setStatus("error");
    }
  }, []);

  const isActive = status === "browsing" || status === "generating";
  const showSplitView = status !== "idle";

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
        <Header />

        {/* Input Bar */}
        <div className="mb-20">
          <InputBar onSubmit={startGeneration} isLoading={isActive} />
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-4 border-black bg-red-50 p-6 shadow-brutal flex items-start gap-4">
              <div className="bg-black text-white px-2 py-0.5 font-bold text-xs uppercase shrink-0 mt-1">Error</div>
              <p className="font-bold text-lg leading-tight">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Split Panel View */}
        {showSplitView && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Left Panel: Live Browser */}
            <div className="min-h-[600px]">
              <LiveBrowserView
                liveUrl={liveUrl}
                currentUrl={currentUrl}
                isActive={status === "browsing"}
                status={status}
                topic={topic}
                discoveryNodes={discoveryNodes}
                fileCount={files.length}
              />
            </div>

            {/* Right Panel: Skill Tree */}
            <div className="min-h-[600px]">
              <SkillTreePanel
                topic={topic}
                files={files}
                tree={tree}
                status={status}
                discoveryNodes={discoveryNodes}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
