"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import JSZip from "jszip";
import TopicInput from "@/components/TopicInput";
import GraphView from "@/components/GraphView";
import NodePreview from "@/components/NodePreview";
import FileTreePanel from "@/components/FileTreePanel";
import LiveStats from "@/components/LiveStats";
import DepthIndicator from "@/components/DepthIndicator";
import type {
  SkillGraph,
  GeneratedFile,
  GenerateResponse,
  ForceGraphData,
  GraphNode,
  NodeExpansionMeta,
  ExpandNodeResponse,
} from "@/types/graph";
import { slugifyTopic, childFilePath } from "@/lib/graph-paths";
import {
  buildForceGraphData,
  buildInitialNodeMeta,
  countUndirectedLinks,
  maxDepthOf,
} from "@/lib/force-graph";

const EXAMPLE_TOPICS = [
  "Supabase Auth",
  "React Server Components",
  "Postgres Optimization",
  "TypeScript Type System",
  "Vercel AI SDK",
  "Docker Networking",
];

const MAX_NODES = 60;
const WARN_NODES = 50;
const MAX_DEPTH = 5;

interface AppError {
  message: string;
  isPlanLimit?: boolean;
  upgradeUrl?: string;
}

interface Snapshot {
  graph: SkillGraph;
  files: GeneratedFile[];
  nodeMeta: Record<string, NodeExpansionMeta>;
  treeEdges: string[];
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [graph, setGraph] = useState<SkillGraph | null>(null);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [nodeMeta, setNodeMeta] = useState<Record<string, NodeExpansionMeta>>(
    {}
  );
  const [treeEdges, setTreeEdges] = useState<Set<string>>(new Set());
  const [expansionHistory, setExpansionHistory] = useState<
    { nodeId: string; depth: number; timestamp: number }[]
  >([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [submittedTopic, setSubmittedTopic] = useState<string>("");
  const [initialSnapshot, setInitialSnapshot] = useState<Snapshot | null>(null);
  const [bloom, setBloom] = useState<{
    childIds: string[];
    x: number;
    y: number;
  } | null>(null);
  const [recentlyAddedPaths, setRecentlyAddedPaths] = useState<Set<string>>(
    new Set()
  );
  const [expandBusy, setExpandBusy] = useState(false);
  /** Immediate visual: placeholder nodes + dashed edges while expand API runs */
  const [pendingExpansion, setPendingExpansion] = useState<{
    parentId: string;
    x: number;
    y: number;
  } | null>(null);

  const sessionRef = useRef({
    graph: null as SkillGraph | null,
    files: [] as GeneratedFile[],
    nodeMeta: {} as Record<string, NodeExpansionMeta>,
    treeEdges: new Set<string>(),
  });

  useEffect(() => {
    sessionRef.current = { graph, files, nodeMeta, treeEdges };
  }, [graph, files, nodeMeta, treeEdges]);

  const selectedNode: GraphNode | null =
    graph?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const graphData: ForceGraphData | null = useMemo(() => {
    if (!graph) return null;
    return buildForceGraphData(
      graph,
      nodeMeta,
      treeEdges,
      bloom,
      pendingExpansion
    );
  }, [graph, nodeMeta, treeEdges, bloom, pendingExpansion]);

  useEffect(() => {
    if (!bloom) return;
    const t = setTimeout(() => setBloom(null), 1100);
    return () => clearTimeout(t);
  }, [bloom]);

  const linkCount = graph ? countUndirectedLinks(graph) : 0;
  const nodeCount = graph?.nodes.length ?? 0;
  const statsDepth = maxDepthOf(nodeMeta);

  const hasResults = isLoading || !!graphData || !!error;

  async function handleSubmit(topic: string) {
    setSubmittedTopic(topic);
    setIsLoading(true);
    setError(null);
    setGraph(null);
    setFiles([]);
    setNodeMeta({});
    setTreeEdges(new Set());
    setExpansionHistory([]);
    setSelectedNodeId(null);
    setInitialSnapshot(null);
    setBloom(null);
    setRecentlyAddedPaths(new Set());
    setPendingExpansion(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, depth: 0 }),
      });

      const data: GenerateResponse & {
        error?: string;
        upgradeUrl?: string;
        hint?: string;
      } = await res.json();

      if (res.status === 402) {
        setError({
          message: data.error ?? "Concurrency limit reached",
          isPlanLimit: true,
          upgradeUrl: data.upgradeUrl ?? "https://hyperbrowser.ai",
        });
        return;
      }

      if (!res.ok || data.error) {
        setError({ message: data.error ?? "Generation failed" });
        return;
      }

      const slug = slugifyTopic(data.graph.topic);
      const meta = buildInitialNodeMeta(data.graph, slug);

      setGraph(data.graph);
      setFiles(data.files);
      setNodeMeta(meta);
      setTreeEdges(new Set());
      setInitialSnapshot({
        graph: structuredClone(data.graph),
        files: structuredClone(data.files),
        nodeMeta: structuredClone(meta),
        treeEdges: [],
      });

      const indexNode = data.graph.nodes.find((n) => n.type === "moc");
      if (indexNode) {
        setSelectedNodeId(indexNode.id);
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const applyExpansion = useCallback(
    (parentId: string, data: ExpandNodeResponse, coords: { x: number; y: number }) => {
      setPendingExpansion(null);
      setGraph((g) => {
        if (!g) return g;
        const nodes = [...g.nodes];
        const pi = nodes.findIndex((n) => n.id === parentId);
        if (pi < 0) return g;
        const parent = nodes[pi];
        const childIds = data.newNodes.map((n) => n.id);
        const linkSet = new Set([...parent.links, ...childIds]);
        nodes[pi] = {
          ...parent,
          content: data.parentUpdatedContent,
          links: Array.from(linkSet),
        };
        nodes.push(...data.newNodes);
        return { ...g, nodes };
      });

      setFiles((prev) => {
        const parentPath = sessionRef.current.nodeMeta[parentId]?.filePath;
        const next = prev.map((f) => {
          if (parentPath && f.path === parentPath) {
            return { ...f, content: data.parentUpdatedContent };
          }
          return f;
        });
        next.push(...data.newFiles);
        return next;
      });

      setTreeEdges((prev) => {
        const n = new Set(prev);
        for (const c of data.newNodes) {
          n.add(`${parentId}->${c.id}`);
        }
        return n;
      });

      let parentDepthForHistory = 0;
      setNodeMeta((prev) => {
        const next = { ...prev };
        const pd = next[parentId]?.depth ?? 0;
        parentDepthForHistory = pd;
        next[parentId] = {
          ...next[parentId],
          state: "expanded",
        };
        const parentPathForChild = next[parentId]?.filePath ?? "";
        for (const node of data.newNodes) {
          const path =
            data.newFiles.find(
              (f) =>
                f.path.split("/").pop()?.replace(/\.md$/i, "") === node.id
            )?.path ??
            (parentPathForChild
              ? childFilePath(parentPathForChild, node.id)
              : `${slugifyTopic(sessionRef.current.graph?.topic ?? "")}/${node.id}.md`);
          next[node.id] = {
            state: "child",
            depth: pd + 1,
            parentId,
            filePath: path,
          };
        }
        return next;
      });

      setExpansionHistory((h) => [
        ...h,
        {
          nodeId: parentId,
          depth: parentDepthForHistory,
          timestamp: Date.now(),
        },
      ]);

      setBloom({
        childIds: data.newNodes.map((n) => n.id),
        x: coords.x,
        y: coords.y,
      });

      const paths = new Set(data.newFiles.map((f) => f.path));
      setRecentlyAddedPaths(paths);
      setTimeout(() => setRecentlyAddedPaths(new Set()), 2800);
    },
    []
  );

  const performExpand = useCallback(
    async (nodeId: string, coords: { x: number; y: number }) => {
      const g = sessionRef.current.graph;
      const m = sessionRef.current.nodeMeta;
      const node = g?.nodes.find((n) => n.id === nodeId);
      if (!g || !node || expandBusy) return;

      const meta = m[nodeId];
      if (
        !meta ||
        meta.state === "expanded" ||
        meta.state === "loading" ||
        meta.depth >= MAX_DEPTH ||
        g.nodes.length >= MAX_NODES
      ) {
        return;
      }

      setExpandBusy(true);
      setNodeMeta((prev) => ({
        ...prev,
        [nodeId]: { ...prev[nodeId], state: "loading" },
      }));
      setPendingExpansion({
        parentId: nodeId,
        x: coords.x,
        y: coords.y,
      });

      try {
        const existingNodeIds = g.nodes.map((n) => n.id);
        const parentContext = g.nodes
          .slice(0, 8)
          .map((n) => `${n.label}`)
          .join("; ");

        const res = await fetch("/api/expand-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: g.topic,
            nodeId,
            nodeLabel: node.label,
            nodeContent: node.content,
            existingNodeIds,
            parentContext,
            parentFilePath: meta.filePath,
            parentDepth: meta.depth,
          }),
        });

        const data = (await res.json()) as ExpandNodeResponse & {
          error?: string;
          upgradeUrl?: string;
        };

        if (res.status === 402) {
          setError({
            message: data.error ?? "Concurrency limit reached",
            isPlanLimit: true,
            upgradeUrl: data.upgradeUrl ?? "https://hyperbrowser.ai",
          });
          setPendingExpansion(null);
          setNodeMeta((prev) => ({
            ...prev,
            [nodeId]: {
              ...prev[nodeId],
              state: prev[nodeId]?.parentId ? "child" : "initial",
            },
          }));
          return;
        }

        if (!res.ok || (data as { error?: string }).error) {
          setError({
            message: (data as { error?: string }).error ?? "Expansion failed",
          });
          setPendingExpansion(null);
          setNodeMeta((prev) => ({
            ...prev,
            [nodeId]: {
              ...prev[nodeId],
              state: prev[nodeId]?.parentId ? "child" : "initial",
            },
          }));
          return;
        }

        applyExpansion(nodeId, data, coords);
      } catch (e) {
        setError({
          message: e instanceof Error ? e.message : "Expansion failed",
        });
        setPendingExpansion(null);
        setNodeMeta((prev) => ({
          ...prev,
          [nodeId]: {
            ...prev[nodeId],
            state: prev[nodeId]?.parentId ? "child" : "initial",
          },
        }));
      } finally {
        setExpandBusy(false);
      }
    },
    [applyExpansion, expandBusy]
  );

  const handleResetGraph = useCallback(() => {
    if (!initialSnapshot) return;
    setGraph(structuredClone(initialSnapshot.graph));
    setFiles(structuredClone(initialSnapshot.files));
    setNodeMeta(structuredClone(initialSnapshot.nodeMeta));
    setTreeEdges(new Set(initialSnapshot.treeEdges));
    setExpansionHistory([]);
    setBloom(null);
    setRecentlyAddedPaths(new Set());
    setPendingExpansion(null);
    setError(null);
    const moc = initialSnapshot.graph.nodes.find((n) => n.type === "moc");
    setSelectedNodeId(moc?.id ?? null);
  }, [initialSnapshot]);

  const handleExpandAll = useCallback(async () => {
    if (
      !window.confirm(
        "Expand all unexpanded nodes sequentially. This runs many scrapes and may take a long time. Continue?"
      )
    ) {
      return;
    }
    let guard = 0;
    while (guard++ < 100) {
      const { graph: g, nodeMeta: m } = sessionRef.current;
      if (!g || g.nodes.length >= MAX_NODES) break;
      const next = g.nodes.find((n) => {
        const meta = m[n.id];
        return (
          meta &&
          meta.state !== "expanded" &&
          meta.state !== "loading" &&
          meta.depth < MAX_DEPTH
        );
      });
      if (!next) break;
      await performExpand(next.id, { x: 0, y: 0 });
      await new Promise((r) => setTimeout(r, 350));
    }
  }, [performExpand]);

  async function handleDownload() {
    if (!graph || files.length === 0) return;
    const zip = new JSZip();
    const folder = graph.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    for (const file of files) {
      zip.file(file.path, file.content);
    }

    const mocNode = graph.nodes.find((n) => n.type === "moc");
    const readme = [
      `# ${graph.topic} Skill Graph`,
      ``,
      `**Built with [HyperGraph](https://hyperbrowser.ai)**`,
      ``,
      `A traversable knowledge graph of **${graph.nodes.length} interconnected nodes** covering the ${graph.topic} domain (HyperGraph v2 expandable graph).`,
      ``,
      `## Usage with Claude Code / Cursor`,
      ``,
      `Copy this folder into your \`.claude/skills/\` or \`.cursor/skills/\` directory.`,
      `Point your agent at \`${folder}/${mocNode?.id ?? "moc"}.md\` as the entry point.`,
      ``,
      `Each node is one complete thought. Follow [[wikilinks]] to traverse the domain.`,
      `Your agent will navigate the graph — pulling in exactly what the current situation requires.`,
      ``,
      `## Node Types`,
      ``,
      `- **MOC** — Map of Content; the entry point and domain overview`,
      `- **Concept** — foundational ideas, theories, and frameworks`,
      `- **Pattern** — reusable approaches and techniques`,
      `- **Gotcha** — failure modes, counterintuitive findings, common mistakes`,
      ``,
      `## Nodes`,
      ``,
      ...graph.nodes.map((n) => `- \`${n.id}.md\` — ${n.description}`),
      ``,
      `---`,
      `Follow [@hyperbrowser](https://hyperbrowser.ai) for updates.`,
    ].join("\n");

    zip.file(`${folder}/README.md`, readme);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folder}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleWikilinkClick(nodeId: string) {
    if (graph?.nodes.some((n) => n.id === nodeId)) {
      setSelectedNodeId(nodeId);
    }
  }

  const onCopySkill = useCallback(
    (nodeId: string) => {
      const n = graph?.nodes.find((x) => x.id === nodeId);
      if (n?.content) {
        void navigator.clipboard.writeText(n.content);
      }
    },
    [graph]
  );

  /* ── Landing screen ── */
  if (!hasResults) {
    return (
      <div className="flex h-screen flex-col bg-white font-sans">
        <nav className="flex flex-shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3">
          <a
            href="https://hyperbrowser.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-opacity hover:opacity-70"
          >
            <svg
              width="12"
              height="20"
              viewBox="0 0 104 167"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M76.4409 0.958618L0.27832 83.6963H41.5624C47.8498 83.6963 53.3845 79.5487 55.1561 73.5091L76.4409 0.958618Z"
                fill="#1D1D1D"
              />
              <path
                d="M48.9596 93.881L27.6748 166.434L103.837 83.6959H62.5532C56.2659 83.6959 50.7312 87.8436 48.9596 93.8831V93.881Z"
                fill="#1D1D1D"
              />
            </svg>
            <span
              className="text-[11px] font-semibold text-zinc-400"
              style={{ letterSpacing: "0.01em" }}
            >
              Hyperbrowser
            </span>
          </a>
          <a
            href="https://hyperbrowser.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition-all duration-150 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="M21 2l-9.6 9.6M15.5 7.5l2 2" />
            </svg>
            Get API Key
          </a>
        </nav>

        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            <div className="mb-8 text-center">
              <h1
                className="text-4xl font-bold text-zinc-900"
                style={{ letterSpacing: "-0.04em" }}
              >
                Hyper<span className="font-extralight">Graph</span>
              </h1>
              <p className="accent mt-2.5 text-xs font-semibold text-zinc-400">
                Give your agent a domain to understand, not just instructions to follow
              </p>
            </div>

            <TopicInput
              onSubmit={handleSubmit}
              isLoading={isLoading}
              variant="hero"
            />

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {EXAMPLE_TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => handleSubmit(t)}
                  className="accent rounded-full border border-zinc-200 px-3 py-1.5 text-[10px] font-semibold text-zinc-500 transition-all duration-150 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="accent pb-6 text-center text-[10px] font-semibold text-zinc-300">
          Powered by Hyperbrowser
        </p>
      </div>
    );
  }

  /* ── Results / loading screen ── */
  return (
    <div className="flex h-screen flex-col bg-white font-sans text-zinc-900">
      <header className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-2.5 sm:gap-3 sm:px-5">
        <button
          onClick={() => {
            setGraph(null);
            setFiles([]);
            setError(null);
            setSelectedNodeId(null);
            setSubmittedTopic("");
            setNodeMeta({});
            setTreeEdges(new Set());
            setExpansionHistory([]);
            setInitialSnapshot(null);
            setBloom(null);
            setRecentlyAddedPaths(new Set());
            setPendingExpansion(null);
            setExpandBusy(false);
          }}
          className="flex flex-shrink-0 items-center gap-2 transition-opacity hover:opacity-60"
        >
          <svg
            width="10"
            height="16"
            viewBox="0 0 104 167"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M76.4409 0.958618L0.27832 83.6963H41.5624C47.8498 83.6963 53.3845 79.5487 55.1561 73.5091L76.4409 0.958618Z"
              fill="#1D1D1D"
            />
            <path
              d="M48.9596 93.881L27.6748 166.434L103.837 83.6959H62.5532C56.2659 83.6959 50.7312 87.8436 48.9596 93.8831V93.881Z"
              fill="#1D1D1D"
            />
          </svg>
          <span
            className="font-bold text-zinc-900"
            style={{ letterSpacing: "-0.03em", fontSize: "15px" }}
          >
            Hyper<span className="font-extralight">Graph</span>
          </span>
        </button>
        <div className="hidden h-4 w-px bg-zinc-200 sm:block" />
        <div className="min-w-0 flex-1 basis-[200px]">
          <TopicInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            variant="compact"
            initialValue={submittedTopic}
          />
        </div>

        {graph && initialSnapshot && (
          <button
            type="button"
            onClick={handleResetGraph}
            className="flex flex-shrink-0 items-center rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-all duration-150 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95 sm:px-3"
          >
            Reset Graph
          </button>
        )}

        {graph && (
          <button
            type="button"
            onClick={handleExpandAll}
            disabled={expandBusy || nodeCount >= MAX_NODES}
            className="flex flex-shrink-0 items-center rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-all duration-150 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
          >
            Expand All
          </button>
        )}

        {files.length > 0 && (
          <button
            onClick={handleDownload}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-all duration-150 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95 sm:px-3"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download .zip
          </button>
        )}

        {graph && (
          <span className="hidden font-mono text-[10px] text-zinc-400 lg:inline">
            {nodeCount} nodes · {linkCount} links
          </span>
        )}

        <div className="hidden h-4 w-px bg-zinc-200 sm:block" />
        <a
          href="https://hyperbrowser.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 transition-all duration-150 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95 sm:px-3"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="M21 2l-9.6 9.6M15.5 7.5l2 2" />
          </svg>
          Get API Key
        </a>
      </header>

      {error && !error.isPlanLimit && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-700">
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          {error.message}
        </div>
      )}

      {error?.isPlanLimit && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3">
          <div className="flex items-start gap-2.5">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Free plan — concurrent browser limit reached
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700">
                Your Hyperbrowser plan supports only 1 concurrent browser session. Upgrade to run parallel scrapes.
              </p>
            </div>
          </div>
          <a
            href={error.upgradeUrl ?? "https://hyperbrowser.ai"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded-md bg-amber-800 px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-80"
          >
            Upgrade plan
          </a>
        </div>
      )}

      {graph && nodeCount >= WARN_NODES && nodeCount < MAX_NODES && (
        <div className="border-b border-amber-100 bg-amber-50/80 px-5 py-2 text-center text-[11px] font-medium text-amber-900">
          Graph is getting large ({nodeCount} nodes). Consider resetting or downloading before adding more.
        </div>
      )}

      {graph && nodeCount >= MAX_NODES && (
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-2 text-center text-[11px] font-medium text-zinc-700">
          Node limit reached ({MAX_NODES}). Reset the graph or download your skill pack.
        </div>
      )}

      {isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <div className="relative h-10 w-10">
            <svg className="h-10 w-10 text-zinc-100" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            </svg>
            <svg
              className="absolute inset-0 h-10 w-10 animate-spin text-zinc-900"
              style={{ animationDuration: "0.75s" }}
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 2a10 10 0 0110 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-center">
            <p
              className="text-sm font-bold text-zinc-900"
              style={{ letterSpacing: "-0.02em" }}
            >
              Building{submittedTopic ? ` "${submittedTopic}"` : ""} graph
            </p>
            <p className="accent mt-1.5 text-[10px] font-semibold text-zinc-400">
              Mapping the knowledge structure for this domain
            </p>
          </div>
        </div>
      )}

      {!isLoading && graphData && graph && (
        <main className="flex flex-1 overflow-hidden">
          <FileTreePanel
            files={files}
            graph={graph}
            nodeMeta={nodeMeta}
            selectedNodeId={selectedNodeId}
            onSelect={setSelectedNodeId}
            recentlyAddedPaths={recentlyAddedPaths}
          />
          <div className="relative flex-1 overflow-hidden border-r border-zinc-200">
            <LiveStats
              topic={graph.topic}
              nodeCount={nodeCount}
              linkCount={linkCount}
              maxDepth={statsDepth}
              expansionCount={expansionHistory.length}
            />
            <DepthIndicator maxDepth={statsDepth} />
            <GraphView
              data={graphData}
              graphNodes={graph.nodes}
              nodeMeta={nodeMeta}
              onSelectNode={setSelectedNodeId}
              onRequestExpand={(id, c) => {
                void performExpand(id, c);
              }}
              onCopySkill={onCopySkill}
              selectedNodeId={selectedNodeId}
              maxNodes={MAX_NODES}
            />
          </div>
          <div className="w-[380px] flex-shrink-0">
            <NodePreview node={selectedNode} onWikilinkClick={handleWikilinkClick} />
          </div>
        </main>
      )}

      <p className="accent flex-shrink-0 py-2 text-center text-[10px] font-semibold text-zinc-300">
        BUILT WITH HYPERBROWSER · POWERED BY HYPERBROWSER
      </p>
    </div>
  );
}
