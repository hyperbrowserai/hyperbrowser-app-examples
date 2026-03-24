"use client";

import { Monitor, Loader2, CheckCircle2, Globe, FileText, Link2 } from "lucide-react";
import { GenerationStatus, DiscoveryNode } from "@/lib/types";
import StatusBar from "./StatusBar";

interface LiveBrowserViewProps {
  liveUrl: string | null;
  currentUrl: string;
  isActive: boolean;
  status: GenerationStatus;
  topic: string;
  discoveryNodes: DiscoveryNode[];
  fileCount: number;
}

function CompletionSummary({
  topic,
  discoveryNodes,
  fileCount,
  status,
}: {
  topic: string;
  discoveryNodes: DiscoveryNode[];
  fileCount: number;
  status: GenerationStatus;
}) {
  const isGenerating = status === "generating";

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 bg-[#0a0a0a] text-white">
      <div className="max-w-sm w-full space-y-8">
        {/* Status icon */}
        <div className="flex justify-center">
          {isGenerating ? (
            <Loader2 size={36} className="animate-spin text-gray-500" />
          ) : (
            <CheckCircle2 size={36} className="text-white" />
          )}
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            {isGenerating ? "Generating Skills" : "Browsing Complete"}
          </h3>
          <p className="font-mono text-lg font-bold">{topic}</p>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-6 py-4 border-y border-gray-800">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-gray-500" />
            <span className="font-mono text-sm text-gray-400">
              {discoveryNodes.length} page{discoveryNodes.length !== 1 ? "s" : ""} visited
            </span>
          </div>
          {fileCount > 0 && (
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-gray-500" />
              <span className="font-mono text-sm text-gray-400">
                {fileCount} skill{fileCount !== 1 ? "s" : ""} generated
              </span>
            </div>
          )}
        </div>

        {/* Pages list */}
        {discoveryNodes.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
              Pages Browsed
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

export default function LiveBrowserView({
  liveUrl,
  currentUrl,
  isActive,
  status,
  topic,
  discoveryNodes,
  fileCount,
}: LiveBrowserViewProps) {
  const showSummary =
    !isActive && (status === "generating" || status === "complete");

  return (
    <div className="flex flex-col h-full border-4 border-black shadow-brutal bg-white">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b-4 border-black bg-black text-white">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <div className="flex items-center gap-2 ml-3">
          <Monitor size={14} />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {showSummary ? "Session Summary" : "Live Browser View"}
          </span>
        </div>
        {isActive && (
          <div className="ml-auto flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Agent is reading...
            </span>
          </div>
        )}
      </div>

      {/* Browser iframe area / Summary */}
      <div className="flex-1 relative bg-gray-100 min-h-0">
        {showSummary ? (
          <CompletionSummary
            topic={topic}
            discoveryNodes={discoveryNodes}
            fileCount={fileCount}
            status={status}
          />
        ) : liveUrl ? (
          <iframe
            src={liveUrl}
            className="w-full h-full border-0 absolute inset-0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title="HyperAgent Live Browser"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 size={32} className="animate-spin text-gray-400" />
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Starting browser session...
            </span>
          </div>
        )}
      </div>

      {/* Status bar */}
      {!showSummary && (
        <StatusBar currentUrl={currentUrl} isConnected={!!liveUrl} />
      )}
    </div>
  );
}
