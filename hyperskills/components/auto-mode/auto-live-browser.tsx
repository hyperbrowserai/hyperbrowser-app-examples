"use client";

import { Monitor, Loader2, CheckCircle2, Globe, Link2 } from "lucide-react";
import type { AutoDiscoveryNode, AutoModePhase } from "@/types";
import AutoStatusBar from "./auto-status-bar";

interface AutoLiveBrowserProps {
  liveUrl: string | null;
  currentUrl: string;
  phase: AutoModePhase;
  topic: string;
  discoveryNodes: AutoDiscoveryNode[];
  agentStatus: string;
}

function SessionSummary({
  topic,
  discoveryNodes,
  phase,
}: {
  topic: string;
  discoveryNodes: AutoDiscoveryNode[];
  phase: AutoModePhase;
}) {
  const isGenerating = phase === "generating";
  const isError = phase === "error";

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 bg-[#0a0a0a] text-white">
      <div className="max-w-sm w-full space-y-8">
        <div className="flex justify-center">
          {isGenerating ? (
            <Loader2 size={36} className="animate-spin text-gray-500" />
          ) : (
            <CheckCircle2 size={36} className={isError ? "text-gray-500" : "text-white"} />
          )}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            {isGenerating
              ? "Building skill tree"
              : isError
                ? "Session ended"
                : "Browsing complete"}
          </h3>
          <p className="font-mono text-lg font-bold break-words">{topic}</p>
        </div>

        <div className="flex justify-center gap-6 py-4 border-y border-gray-800">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-gray-500" />
            <span className="font-mono text-sm text-gray-400">
              {discoveryNodes.length} page
              {discoveryNodes.length !== 1 ? "s" : ""} visited
            </span>
          </div>
        </div>

        {discoveryNodes.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
              Pages browsed
            </span>
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {discoveryNodes.map((node) => {
                let hostname = "";
                try {
                  hostname = new URL(node.url).hostname.replace("www.", "");
                } catch {
                  hostname = node.url;
                }
                return (
                  <div
                    key={node.id}
                    className="flex items-start gap-2 py-1.5 px-2 rounded bg-gray-900/50"
                  >
                    <Link2
                      size={12}
                      className="text-gray-600 mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-300 truncate">
                        {node.title}
                      </p>
                      <p className="font-mono text-[10px] text-gray-600 truncate">
                        {hostname}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AutoLiveBrowser({
  liveUrl,
  currentUrl,
  phase,
  topic,
  discoveryNodes,
  agentStatus,
}: AutoLiveBrowserProps) {
  const isBrowsing =
    phase === "browsing" || phase === "searching" || phase === "generating";
  const showSummary = phase === "complete" || phase === "error";

  return (
    <div className="flex flex-col h-full border-4 border-black shadow-brutal bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b-4 border-black bg-black text-white shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <div className="flex items-center gap-2 ml-3">
          <Monitor size={14} />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {showSummary ? "Session summary" : "Live browser"}
          </span>
        </div>
        {isBrowsing && (
          <div className="ml-auto flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider hidden sm:inline">
              Agent is reading...
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-gray-100 min-h-0">
        {showSummary ? (
          <div className="absolute inset-0 overflow-auto">
            <SessionSummary
              topic={topic}
              discoveryNodes={discoveryNodes}
              phase={phase}
            />
          </div>
        ) : liveUrl ? (
          <iframe
            src={liveUrl}
            className="w-full h-full border-0 absolute inset-0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title="HyperAgent live browser"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 size={32} className="animate-spin text-gray-400" />
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider text-center px-4">
              Starting browser session...
            </span>
          </div>
        )}
      </div>

      {!showSummary && (
        <div className="shrink-0">
          <AutoStatusBar
            currentUrl={currentUrl}
            isConnected={!!liveUrl}
            agentStatus={agentStatus}
          />
        </div>
      )}
    </div>
  );
}
