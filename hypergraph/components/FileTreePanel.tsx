"use client";

import { useState, useMemo } from "react";
import type { GeneratedFile, SkillGraph, NodeType, NodeExpansionMeta } from "@/types/graph";
import CliTree from "@/components/CliTree";

interface FileTreePanelProps {
  files: GeneratedFile[];
  graph: SkillGraph;
  nodeMeta: Record<string, NodeExpansionMeta>;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  recentlyAddedPaths: Set<string>;
}

const TYPE_DOT: Record<NodeType, string> = {
  moc: "bg-zinc-900",
  concept: "bg-zinc-600",
  pattern: "bg-zinc-400",
  gotcha: "border border-zinc-300 bg-white",
};

function toNodeId(filePath: string): string {
  const name = filePath.split("/").pop() ?? filePath;
  return name.replace(/\.md$/, "");
}

interface FsNode {
  name: string;
  path: string | null;
  children: FsNode[];
}

function buildFsTree(files: GeneratedFile[]): FsNode {
  const root: FsNode = { name: "", path: null, children: [] };

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let next = cur.children.find((c) => c.name === part);
      if (!next) {
        next = { name: part, path: null, children: [] };
        cur.children.push(next);
      }
      if (isLast) {
        next.path = file.path;
      }
      cur = next;
    }
  }

  function sortChildren(n: FsNode) {
    n.children.sort((a, b) => {
      const aFile = a.path !== null;
      const bFile = b.path !== null;
      if (aFile !== bFile) return aFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    for (const c of n.children) sortChildren(c);
  }
  sortChildren(root);

  return root;
}

function renderTreeRows(params: {
  fs: FsNode;
  graph: SkillGraph;
  depth: number;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
  recentlyAddedPaths: Set<string>;
}): React.ReactNode[] {
  const { fs, graph, depth, selectedNodeId, onSelect, recentlyAddedPaths } = params;
  const rows: React.ReactNode[] = [];
  const sorted = [...fs.children];

  sorted.forEach((child, i) => {
    const isLast = i === sorted.length - 1;
    const branch = depth === 0 ? "" : isLast ? "└ " : "├ ";

    if (child.path) {
      const nodeId = toNodeId(child.path);
      const gn = graph.nodes.find((n) => n.id === nodeId);
      const isActive = nodeId === selectedNodeId;
      const isNew = recentlyAddedPaths.has(child.path);
      rows.push(
        <button
          key={child.path}
          onClick={() => onSelect(nodeId)}
          title={gn?.description ?? child.name}
          className={`flex w-full items-center gap-1.5 py-[5px] pr-2 text-left font-mono text-[11px] transition-all duration-500 ${
            isActive
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
          } ${isNew ? "bg-zinc-50 ring-1 ring-inset ring-zinc-300/80" : ""}`}
          style={{ paddingLeft: `${8 + depth * 10}px` }}
        >
          <span className="w-4 flex-shrink-0 text-center font-mono text-[10px] text-zinc-300">
            {branch}
          </span>
          <span
            className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${gn ? TYPE_DOT[gn.type] : "bg-zinc-300"}`}
          />
          <span className={`flex-1 truncate ${isActive ? "font-semibold" : ""}`}>
            {child.name}
          </span>
        </button>
      );
    } else {
      rows.push(
        <div
          key={`${child.name}-${depth}`}
          className="flex w-full items-center gap-1 py-1 text-zinc-400"
          style={{ paddingLeft: `${8 + depth * 10}px` }}
        >
          <span className="w-4 flex-shrink-0 text-center font-mono text-[10px] text-zinc-300">
            {branch}
          </span>
          <svg
            className="h-3 w-3 flex-shrink-0 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v8.25"
            />
          </svg>
          <span className="truncate font-mono text-[11px] text-zinc-500">{child.name}</span>
        </div>
      );
      rows.push(
        ...renderTreeRows({
          fs: child,
          graph,
          depth: depth + 1,
          selectedNodeId,
          onSelect,
          recentlyAddedPaths,
        })
      );
    }
  });

  return rows;
}

export default function FileTreePanel({
  files,
  graph,
  nodeMeta,
  selectedNodeId,
  onSelect,
  recentlyAddedPaths,
}: FileTreePanelProps) {
  const [tab, setTab] = useState<"files" | "cli">("files");
  const [rootOpen, setRootOpen] = useState(true);

  const topicSlug = graph.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const fsTree = useMemo(() => buildFsTree(files), [files]);

  return (
    <div className="flex h-full w-[220px] flex-shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white">
      <div className="flex flex-shrink-0 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setTab("files")}
          className={`flex-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-widest ${
            tab === "files"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-400 hover:text-zinc-600"
          }`}
          style={{ letterSpacing: "0.06em" }}
        >
          Files
        </button>
        <button
          type="button"
          onClick={() => setTab("cli")}
          className={`flex-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-widest ${
            tab === "cli"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-400 hover:text-zinc-600"
          }`}
          style={{ letterSpacing: "0.06em" }}
        >
          CLI
        </button>
      </div>

      {tab === "files" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-shrink-0 items-center border-b border-zinc-200 px-3 py-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400"
              style={{ letterSpacing: "0.08em" }}
            >
              Explorer
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            <button
              onClick={() => setRootOpen((o) => !o)}
              className="flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors hover:bg-zinc-50"
            >
              <svg
                className={`h-3 w-3 flex-shrink-0 text-zinc-400 transition-transform duration-150 ${rootOpen ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <svg
                className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v8.25"
                />
              </svg>
              <span
                className="flex-1 truncate font-mono text-[11px] text-zinc-600"
                title={topicSlug}
              >
                {topicSlug}
              </span>
              <span className="ml-auto flex-shrink-0 rounded-full bg-zinc-100 px-1.5 py-px font-mono text-[9px] text-zinc-400">
                {files.length}
              </span>
            </button>
            {rootOpen && (
              <div className="pb-2">
                {renderTreeRows({
                  fs: fsTree,
                  graph,
                  depth: 0,
                  selectedNodeId,
                  onSelect,
                  recentlyAddedPaths,
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <CliTree topic={graph.topic} files={files} nodeMeta={nodeMeta} />
        </div>
      )}
    </div>
  );
}
