"use client";

import { useMemo } from "react";
import type { GeneratedFile } from "@/types/graph";
import type { NodeExpansionMeta } from "@/types/graph";

interface CliTreeProps {
  topic: string;
  files: GeneratedFile[];
  nodeMeta: Record<string, NodeExpansionMeta>;
}

interface TreeNode {
  name: string;
  path?: string;
  nodeId?: string;
  links: string[];
  children: Map<string, TreeNode>;
}

function extractLinks(content: string): string[] {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];
  const linksMatch = frontmatterMatch[1].match(/links:\s*\[([^\]]*)\]/);
  if (!linksMatch) return [];
  return linksMatch[1]
    .split(",")
    .map((l) => l.trim().replace(/['"]/g, ""))
    .filter(Boolean);
}

function toNodeIdFromPath(filePath: string): string {
  const name = filePath.split("/").pop() ?? filePath;
  return name.replace(/\.md$/i, "");
}

function countUndirectedLinks(files: GeneratedFile[], nodeIds: Set<string>): number {
  const pair = new Set<string>();
  for (const f of files) {
    const id = toNodeIdFromPath(f.path);
    for (const t of extractLinks(f.content)) {
      if (!nodeIds.has(t) || t === id) continue;
      const a = id < t ? id : t;
      const b = id < t ? t : id;
      pair.add(`${a}::${b}`);
    }
  }
  return pair.size;
}

function buildTree(files: GeneratedFile[]): TreeNode {
  const root: TreeNode = { name: "", links: [], children: new Map() };
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        const isFile = i === parts.length - 1 && part.endsWith(".md");
        current.children.set(part, {
          name: part,
          path: isFile ? file.path : undefined,
          nodeId: isFile ? toNodeIdFromPath(file.path) : undefined,
          links: isFile ? extractLinks(file.content) : [],
          children: new Map(),
        });
      }
      current = current.children.get(part)!;
    }
  }
  return root;
}

function renderNode(
  node: TreeNode,
  prefix: string,
  isLast: boolean,
  isRoot: boolean,
  nodeMeta: Record<string, NodeExpansionMeta>,
  expandedIds: Set<string>
): string[] {
  const lines: string[] = [];
  const connector = isRoot ? "" : isLast ? "└── " : "├── ";
  const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");

  if (!isRoot) {
    const isFolder = node.children.size > 0 && !node.path;
    let line = prefix + connector;
    if (isFolder) {
      line += `${node.name}/`;
    } else {
      const nid = node.nodeId ?? "";
      const expanded = nid && expandedIds.has(nid);
      const depth = nid && nodeMeta[nid] ? nodeMeta[nid].depth : 0;
      if (expanded) {
        line += `[expanded] `;
      }
      line += node.name;
      line += ` [d=${depth}]`;
      if (node.links.length > 0) {
        line += ` ──→ [${node.links.join(", ")}]`;
      }
      if (node.name === "index.md" || nid === "moc") {
        line += " (entry point)";
      }
    }
    lines.push(line);
  }

  const children = Array.from(node.children.values());
  const folders = children.filter((c) => c.children.size > 0 && !c.path);
  const fileNodes = children.filter((c) => c.path || c.children.size === 0);
  const sorted = [...folders, ...fileNodes];
  sorted.forEach((child, i) => {
    const last = i === sorted.length - 1;
    lines.push(...renderNode(child, childPrefix, last, false, nodeMeta, expandedIds));
  });

  return lines;
}

export default function CliTree({ topic, files, nodeMeta }: CliTreeProps) {
  const treeText = useMemo(() => {
    const nodeIds = new Set(
      files.map((f) => toNodeIdFromPath(f.path))
    );
    const linkCount = countUndirectedLinks(files, nodeIds);
    const maxDepth = Math.max(
      0,
      ...Object.values(nodeMeta).map((m) => m.depth)
    );
    const expandedIds = new Set(
      Object.entries(nodeMeta)
        .filter(([, m]) => m.state === "expanded")
        .map(([id]) => id)
    );
    const tree = buildTree(files);
    const lines = renderNode(tree, "", true, true, nodeMeta, expandedIds);
    const header = `${topic} (${files.length} nodes, ${linkCount} links, depth: ${maxDepth})`;
    return [header, "│", ...lines].join("\n");
  }, [topic, files, nodeMeta]);

  return (
    <div className="flex h-full min-h-[200px] flex-col overflow-hidden border-t border-zinc-200 bg-zinc-50">
      <div className="flex flex-shrink-0 items-center border-b border-zinc-200 px-3 py-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400"
          style={{ letterSpacing: "0.08em" }}
        >
          CLI tree
        </span>
      </div>
      <pre className="flex-1 overflow-auto p-3 font-mono text-[10px] leading-relaxed text-zinc-600">
        {treeText}
      </pre>
      <p className="accent flex-shrink-0 border-t border-zinc-200 px-3 py-2 text-center text-[9px] font-semibold text-zinc-400">
        Generated by HyperGraph v2 — Powered by Hyperbrowser
      </p>
    </div>
  );
}
