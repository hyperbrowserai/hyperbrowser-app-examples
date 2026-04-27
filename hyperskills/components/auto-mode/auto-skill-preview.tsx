"use client";

import {
  FileCode,
  Loader2,
  Link2,
  Globe,
  GitBranch,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { AutoDiscoveryNode, AutoModePhase } from "@/types";
import type { SkillTreeResult } from "@/types";

interface AutoSkillPreviewProps {
  topic: string;
  phase: AutoModePhase;
  discoveryNodes: AutoDiscoveryNode[];
  agentStatus: string;
  skillResult: SkillTreeResult | null;
  streamComplete: boolean;
}

/* ─── Research Log — shown while browsing ─────────────────────────────── */
function ResearchLog({
  topic,
  discoveryNodes,
  agentStatus,
  phase,
}: {
  topic: string;
  discoveryNodes: AutoDiscoveryNode[];
  agentStatus: string;
  phase: AutoModePhase;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [discoveryNodes.length]);

  const isSearching = phase === "searching";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <div className="shrink-0 px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-gray-400">
            {isSearching
              ? "Searching documentation..."
              : agentStatus || "Browsing..."}
          </span>
        </div>

        <p className="font-mono text-lg font-bold text-white break-words leading-snug">
          {topic}
        </p>

        <div className="mt-3 flex items-center gap-4 text-xs font-mono text-gray-500 border-t border-gray-800 pt-3">
          <span className="flex items-center gap-1.5">
            <Globe size={12} className="text-gray-600" />
            {discoveryNodes.length} page
            {discoveryNodes.length !== 1 ? "s" : ""} visited
          </span>
          <span className="flex items-center gap-1.5">
            <GitBranch size={12} className="text-gray-600" />
            Skill tree after research
          </span>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 space-y-2"
      >
        {discoveryNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Loader2 size={28} className="animate-spin text-gray-600" />
            <p className="font-mono text-xs text-gray-600 uppercase tracking-widest">
              Waiting for browser session...
            </p>
          </div>
        ) : (
          discoveryNodes.map((node, i) => {
            let hostname = "";
            try {
              hostname = new URL(node.url).hostname.replace("www.", "");
            } catch {
              hostname = node.url;
            }
            const isLatest = i === discoveryNodes.length - 1;

            return (
              <div
                key={node.id}
                className={`flex items-start gap-3 rounded px-3 py-2.5 transition-all duration-300 ${
                  isLatest
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-gray-900/60"
                }`}
              >
                <Link2
                  size={13}
                  className={`mt-0.5 shrink-0 ${isLatest ? "text-green-400" : "text-gray-600"}`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-mono text-xs truncate ${
                      isLatest ? "text-white font-bold" : "text-gray-400"
                    }`}
                  >
                    {node.title}
                  </p>
                  <p className="font-mono text-[10px] text-gray-600 truncate mt-0.5">
                    {hostname}
                  </p>
                </div>
                {isLatest && (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                    reading
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 px-5 py-3 border-t border-gray-800">
        <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest text-center flex items-center justify-center gap-2">
          <Loader2 size={10} className="animate-spin" />
          Skill files building below as pages load
        </p>
      </div>
    </div>
  );
}

/* ─── Generating Panel — shows skill files appearing live ──────────────── */
function GeneratingPanel({
  topic,
  skillResult,
  streamComplete,
}: {
  topic: string;
  skillResult: SkillTreeResult | null;
  streamComplete: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [skillResult?.files.length]);

  const files = skillResult?.files ?? [];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <div className="shrink-0 px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-4">
          {!streamComplete ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
            </span>
          ) : (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          )}
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-gray-400">
            {streamComplete ? "Skill tree complete" : "Building skill tree..."}
          </span>
        </div>

        <p className="font-mono text-lg font-bold text-white break-words leading-snug">
          {skillResult?.topic || topic}
        </p>

        <div className="mt-3 flex items-center gap-4 text-xs font-mono text-gray-500 border-t border-gray-800 pt-3">
          <span className="flex items-center gap-1.5">
            <GitBranch size={12} className="text-gray-600" />
            {files.length} skill file{files.length !== 1 ? "s" : ""} generated
          </span>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 space-y-2"
      >
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Loader2 size={28} className="animate-spin text-gray-600" />
            <p className="font-mono text-xs text-gray-600 uppercase tracking-widest">
              Generating skill files...
            </p>
          </div>
        ) : (
          files.map((file, i) => {
            const isLatest = !streamComplete && i === files.length - 1;
            return (
              <div
                key={file.path}
                className={`flex items-start gap-3 rounded px-3 py-2.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                  isLatest
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-gray-900/60"
                }`}
              >
                <FileCode
                  size={13}
                  className={`mt-0.5 shrink-0 ${
                    isLatest ? "text-yellow-400" : "text-gray-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-mono text-xs truncate ${
                      isLatest ? "text-white font-bold" : "text-gray-400"
                    }`}
                  >
                    {file.path}
                  </p>
                  {file.content && (
                    <p className="font-mono text-[10px] text-gray-600 truncate mt-0.5">
                      {file.content.split("\n").find((l) => l.startsWith("description:"))?.replace("description:", "").trim() ||
                        file.content.split("\n").find((l) => l.trim().length > 2 && !l.startsWith("#") && !l.startsWith("---"))?.trim() ||
                        ""}
                    </p>
                  )}
                </div>
                {isLatest && (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                    writing
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {!streamComplete && (
        <div className="shrink-0 px-5 py-3 border-t border-gray-800">
          <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest text-center flex items-center justify-center gap-2">
            <Loader2 size={10} className="animate-spin" />
            Skill tree expanding below
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */
export default function AutoSkillPreview({
  topic,
  phase,
  discoveryNodes,
  agentStatus,
  skillResult,
  streamComplete,
}: AutoSkillPreviewProps) {
  const isBrowsing = phase === "searching" || phase === "browsing";
  const isGenerating =
    phase === "generating" || phase === "complete" || phase === "error";
  const panelTitle = isBrowsing
    ? "Research Log"
    : `Skill Tree${skillResult ? ` · ${skillResult.files.length} files` : ""}`;

  return (
    <div className="flex flex-col h-full border-4 border-black shadow-brutal bg-white overflow-hidden">
      {/* Title bar */}
      <div className="bg-black text-white px-4 py-3 flex items-center justify-between gap-3 border-b-4 border-black shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
          <div className="ml-2 flex items-center gap-2 font-mono text-sm text-gray-400 min-w-0">
            <FileCode size={14} className="shrink-0" />
            <span className="truncate">{panelTitle}</span>
          </div>
        </div>

        {isGenerating && !streamComplete && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 shrink-0">
            <Loader2 size={13} className="animate-spin" />
            Streaming
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isBrowsing ? (
          <ResearchLog
            topic={topic}
            discoveryNodes={discoveryNodes}
            agentStatus={agentStatus}
            phase={phase}
          />
        ) : (
          <GeneratingPanel
            topic={topic}
            skillResult={skillResult}
            streamComplete={streamComplete}
          />
        )}
      </div>
    </div>
  );
}
