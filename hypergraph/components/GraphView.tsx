"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphData, GraphNode, NodeExpansionMeta } from "@/types/graph";
import NodeContextMenu from "@/components/NodeContextMenu";
import {
  expansionRingColor,
  nodeBaseFill,
  showExpandHint,
} from "@/components/ExpandableNode";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphViewProps {
  data: ForceGraphData;
  graphNodes: GraphNode[];
  nodeMeta: Record<string, NodeExpansionMeta>;
  onSelectNode: (nodeId: string) => void;
  onRequestExpand: (nodeId: string, graphCoords: { x: number; y: number }) => void;
  onCopySkill: (nodeId: string) => void;
  selectedNodeId: string | null;
  maxNodes: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLink = any;

const R = 3.5;

const LEGEND: { type: GraphNode["type"]; label: string }[] = [
  { type: "moc", label: "MOC" },
  { type: "concept", label: "Concept" },
  { type: "pattern", label: "Pattern" },
  { type: "gotcha", label: "Gotcha" },
];

export default function GraphView({
  data,
  graphNodes,
  nodeMeta,
  onSelectNode,
  onRequestExpand,
  onCopySkill,
  selectedNodeId,
  maxNodes,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [pulseTick, setPulseTick] = useState(0);
  const [menu, setMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);
  const lastClickRef = useRef<{ id: string; t: number } | null>(null);

  const nodesById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of graphNodes) m.set(n.id, n);
    return m;
  }, [graphNodes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      setTimeout(() => graphRef.current?.zoomToFit(400, 60), 500);
    }
  }, [data]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const fg = graphRef.current;
      if (!fg) return;
      const charge = fg.d3Force("charge");
      if (charge && typeof charge.strength === "function") {
        charge.strength(-380);
      }
      if (charge && typeof charge.distanceMax === "function") {
        charge.distanceMax(520);
      }
      const link = fg.d3Force("link");
      if (link && typeof link.distance === "function") {
        link.distance((linkObj: AnyLink) => {
          if (linkObj.isPending) return 50;
          if (linkObj.isTreeLink) return 55;
          const s = linkObj.source;
          const t = linkObj.target;
          const st = typeof s === "object" ? s?.type : undefined;
          const tt = typeof t === "object" ? t?.type : undefined;
          if (st === "moc" || tt === "moc") return 180;
          return 95;
        });
      }
      fg.d3ReheatSimulation();
    });
    return () => cancelAnimationFrame(id);
  }, [data, dimensions.width, dimensions.height]);

  const hasPendingPlaceholders = useMemo(
    () => data.nodes.some((n: AnyNode) => n.isPendingPlaceholder),
    [data.nodes]
  );
  const anyLoading =
    Object.values(nodeMeta).some((m) => m.state === "loading") ||
    hasPendingPlaceholders;
  useEffect(() => {
    if (!anyLoading) return;
    const t = setInterval(() => setPulseTick((x) => x + 1), 90);
    return () => clearInterval(t);
  }, [anyLoading]);

  const hoverDescription = useMemo(() => {
    if (!hoveredNode) return "";
    const fromGraph = data.nodes.find((n: AnyNode) => n.id === hoveredNode);
    if (fromGraph?.description) return fromGraph.description;
    return nodesById.get(hoveredNode)?.description ?? "";
  }, [hoveredNode, data.nodes, nodesById]);

  const nodeCanvasObject = useCallback(
    (node: AnyNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      void pulseTick;
      if (node.isPendingPlaceholder) {
        const pulse = 0.5 + Math.sin(pulseTick * 0.42) * 0.22;
        const baseSize = (node.val ?? 1) * R;
        const size = baseSize * (0.88 + pulse * 0.12);
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const dash = [5 / globalScale, 4 / globalScale];
        ctx.beginPath();
        ctx.arc(x, y, size + 7 + pulse * 5, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(82,82,91,${0.35 + pulse * 0.28})`;
        ctx.lineWidth = 2;
        ctx.setLineDash(dash);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(250,250,250,${0.82 + pulse * 0.12})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(113,113,122,0.55)";
        ctx.lineWidth = 1.25;
        ctx.setLineDash([3 / globalScale, 3 / globalScale]);
        ctx.stroke();
        ctx.setLineDash([]);
        const fontSize = Math.max(11 / globalScale, 3);
        ctx.font = `600 ${fontSize}px ui-monospace, Menlo, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(82,82,91,${0.55 + pulse * 0.25})`;
        ctx.fillText("···", x, y);
        const ly = y + size + 8;
        const sub = "new";
        ctx.font = `500 ${Math.max(8 / globalScale, 2.5)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textBaseline = "top";
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.strokeText(sub, x, ly);
        ctx.fillStyle = "#71717a";
        ctx.fillText(sub, x, ly);
        return;
      }

      const meta = nodeMeta[node.id] as NodeExpansionMeta | undefined;
      const state = meta?.state ?? "initial";
      const type = (node.type ?? "concept") as GraphNode["type"];
      const base = nodeBaseFill(type, state, node.id === selectedNodeId);
      const size = (node.val ?? 1) * R;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNode && !isSelected;

      const canExpandHint = showExpandHint(state) && state !== "loading";
      if (canExpandHint || state === "loading") {
        const pulse =
          state === "loading"
            ? 0.45 + Math.sin(pulseTick * 0.35) * 0.12
            : 1;
        ctx.beginPath();
        ctx.arc(x, y, size + 5 + (state === "loading" ? pulse * 4 : 0), 0, 2 * Math.PI);
        ctx.strokeStyle = expansionRingColor(state);
        ctx.lineWidth = state === "loading" ? 2 + pulse : 1.25;
        ctx.stroke();
      }

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, size + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(0,0,0,0.04)";
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(0,0,0,0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = base.fill;
      ctx.fill();
      ctx.shadowColor = "transparent";
      if (base.strokeW > 0) {
        ctx.strokeStyle = base.stroke;
        ctx.lineWidth = base.strokeW;
        ctx.stroke();
      }

      if (type === "moc" && !isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.35, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();
      }

      if (canExpandHint) {
        ctx.fillStyle = isSelected ? "#000000" : "rgba(255,255,255,0.95)";
        ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1;
        const px = x + size * 0.65;
        const py = y - size * 0.65;
        ctx.beginPath();
        ctx.arc(px, py, 3.2 / globalScale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isSelected ? "#ffffff" : "#18181b";
        ctx.font = `700 ${Math.max(5 / globalScale, 3)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+", px, py + 0.3 / globalScale);
      }

      const fontSize = Math.max(10 / globalScale, 2.2);
      const weight = isSelected ? "700" : "500";
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        "-0.02em";
      ctx.font = `${weight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const label = node.label ?? "";
      const ly = y + size + 7;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeText(label, x, ly);
      ctx.fillStyle = isSelected ? "#000000" : "#404040";
      ctx.fillText(label, x, ly);
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        "0px";

      const d = meta?.depth ?? 0;
      if (d > 0) {
        const ds = Math.max(7 / globalScale, 2.4);
        ctx.font = `600 ${ds}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const badge = `d${d}`;
        const ty = y - size - 6 / globalScale;
        ctx.lineWidth = 3 / globalScale;
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.strokeText(badge, x, ty);
        ctx.fillStyle = "#52525b";
        ctx.fillText(badge, x, ty);
      }
    },
    [selectedNodeId, hoveredNode, nodeMeta, pulseTick]
  );

  const nodePointerAreaPaint = useCallback(
    (node: AnyNode, color: string, ctx: CanvasRenderingContext2D) => {
      const size = (node.val ?? 1) * R;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, size + 8, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    []
  );

  const handleNodeClick = useCallback(
    (node: AnyNode, evt: MouseEvent) => {
      if (node.isPendingPlaceholder) return;
      const now = Date.now();
      const last = lastClickRef.current;
      if (last && last.id === node.id && now - last.t < 380) {
        lastClickRef.current = null;
        const meta = nodeMeta[node.id];
        if (
          meta &&
          meta.state !== "expanded" &&
          meta.state !== "loading" &&
          graphNodes.length < maxNodes &&
          meta.depth < 5
        ) {
          onRequestExpand(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
        }
        setMenu(null);
        return;
      }
      lastClickRef.current = { id: node.id, t: now };
      onSelectNode(node.id);
      setMenu({
        nodeId: node.id,
        x: Math.min(evt.clientX, window.innerWidth - 200),
        y: Math.min(evt.clientY, window.innerHeight - 140),
      });
    },
    [graphNodes.length, maxNodes, nodeMeta, onRequestExpand, onSelectNode]
  );

  const menuNode = menu ? nodesById.get(menu.nodeId) : null;
  const menuMeta = menu ? nodeMeta[menu.nodeId] : undefined;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      style={{
        backgroundImage:
          "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        backgroundColor: "#fafafa",
      }}
    >
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeClick={handleNodeClick}
        onNodeHover={(node: AnyNode) => setHoveredNode(node?.id ?? null)}
        linkColor={(link: AnyLink) =>
          link.isPending
            ? "rgba(82,82,91,0.5)"
            : link.isTreeLink
              ? "rgba(24,24,27,0.55)"
              : "rgba(161,161,170,0.4)"
        }
        linkWidth={(link: AnyLink) =>
          link.isPending ? 1.6 : link.isTreeLink ? 2 : 1.2
        }
        linkLineDash={(link: AnyLink) =>
          link.isPending ? [5, 4] : null
        }
        linkDirectionalParticles={(link: AnyLink) => (link.isPending ? 3 : 2)}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => "rgba(0,0,0,0.45)"}
        backgroundColor="transparent"
        d3AlphaDecay={0.022}
        d3VelocityDecay={0.24}
        warmupTicks={80}
        cooldownTicks={120}
        onEngineStop={() => graphRef.current?.zoomToFit(400, 60)}
      />

      {hoveredNode && !menu && (
        <div className="pointer-events-none absolute bottom-16 left-4 right-4 z-10 flex justify-center">
          <div className="max-w-lg rounded-md border border-zinc-200 bg-white/95 px-3 py-2 text-center shadow-sm backdrop-blur-sm">
            <p className="accent text-[10px] font-semibold text-zinc-500">
              {hoverDescription}
            </p>
          </div>
        </div>
      )}

      {menu && menuNode && (
        <NodeContextMenu
          x={menu.x}
          y={menu.y}
          canGoDeeper={
            !!menuMeta &&
            menuMeta.state !== "expanded" &&
            menuMeta.state !== "loading" &&
            graphNodes.length < maxNodes &&
            menuMeta.depth < 5
          }
          goDeeperDisabledReason={
            graphNodes.length >= maxNodes
              ? "Node limit reached"
              : menuMeta && menuMeta.depth >= 5
                ? "Max depth reached"
                : menuMeta?.state === "expanded"
                  ? "Already expanded"
                  : undefined
          }
          onGoDeeper={() => {
            const fg = graphRef.current;
            const gd = fg?.graphData?.();
            const n = gd?.nodes?.find((x: AnyNode) => x.id === menu.nodeId);
            const cx = n?.x ?? 0;
            const cy = n?.y ?? 0;
            onRequestExpand(menu.nodeId, { x: cx, y: cy });
          }}
          onViewContent={() => onSelectNode(menu.nodeId)}
          onCopySkill={() => onCopySkill(menu.nodeId)}
          onClose={() => setMenu(null)}
        />
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-zinc-200 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur-sm">
        <p className="accent mb-2 text-[9px] font-semibold text-zinc-400">
          Node types
        </p>
        <div className="flex flex-col gap-1.5">
          {LEGEND.map(({ type, label }) => {
            const s = nodeBaseFill(type, "initial", false);
            return (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor: s.fill,
                    border:
                      s.strokeW > 0 ? `${s.strokeW}px solid ${s.stroke}` : "none",
                    outline:
                      type === "moc" ? "2px solid rgba(0,0,0,0.12)" : "none",
                    outlineOffset: "1px",
                  }}
                />
                <span className="accent text-[9px] font-semibold text-zinc-500">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <p className="accent mt-2 border-t border-zinc-100 pt-2 text-[8px] font-semibold text-zinc-400">
          Double-click to go deeper · + = expandable · dashed edge = generating
        </p>
      </div>
    </div>
  );
}
