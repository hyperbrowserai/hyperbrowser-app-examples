"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphData, NodeType } from "@/types/graph";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphViewProps {
  data: ForceGraphData;
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any;

const R = 3.5; // base radius multiplier, reduced to avoid clutter

// Visual config per type
const NODE_STYLE: Record<
  NodeType,
  { fill: string; stroke: string; strokeW: number; innerDot: boolean }
> = {
  moc:     { fill: "#18181b", stroke: "#000000", strokeW: 0,   innerDot: true  },
  concept: { fill: "#27272a", stroke: "#000000", strokeW: 0,   innerDot: false },
  pattern: { fill: "#52525b", stroke: "#000000", strokeW: 0,   innerDot: false },
  gotcha:  { fill: "#ffffff", stroke: "#d4d4d8", strokeW: 1.5, innerDot: false },
};

const LEGEND: { type: NodeType; label: string }[] = [
  { type: "moc",     label: "MOC"     },
  { type: "concept", label: "Concept" },
  { type: "pattern", label: "Pattern" },
  { type: "gotcha",  label: "Gotcha"  },
];

export default function GraphView({
  data,
  onNodeClick,
  selectedNodeId,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

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

  // Configure d3 forces via the ref (the d3Force prop is not in the TS types)
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    const charge = fg.d3Force("charge");
    if (charge) {
      charge.strength(-350);
      charge.distanceMax(500);
    }
    const link = fg.d3Force("link");
    if (link) {
      link.distance((l: any) =>
        l.source?.type === "moc" || l.target?.type === "moc" ? 180 : 90
      );
    }
  }, [data]);

  const nodeCanvasObject = useCallback(
    (node: AnyNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const type = node.type as NodeType;
      const style = NODE_STYLE[type] ?? NODE_STYLE.concept;
      const size = (node.val ?? 1) * R;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNode && !isSelected;

      // ── Selection rings ──────────────────────────────────────────────────
      if (isSelected) {
        // Outer diffuse halo
        ctx.beginPath();
        ctx.arc(x, y, size + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(0,0,0,0.04)";
        ctx.lineWidth = 6;
        ctx.stroke();
        // Crisp selection ring
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

      // ── Node body ─────────────────────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);

      // Shadow for depth
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      if (isSelected) {
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.shadowColor = "transparent"; // clear shadow for stroke
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = style.fill;
        ctx.fill();
        ctx.shadowColor = "transparent"; // clear shadow for stroke
        if (style.stroke !== "none") {
          ctx.strokeStyle = style.stroke;
          ctx.lineWidth = style.strokeW;
          ctx.stroke();
        }
      }

      // ── Inner accent dot (moc nodes) ─────────────────────────────────────
      if (style.innerDot && !isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.35, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();
      }

      // ── Label — with high-contrast halo ──────────────────────────────────
      const fontSize = Math.max(10 / globalScale, 2.2);
      const weight = isSelected ? "700" : "500";
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "-0.02em";
      ctx.font = `${weight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

      const label = node.label ?? "";
      const ly = y + size + 7;

      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // 1. Thick white halo (stroke) to create separation from background/other nodes
      ctx.lineJoin = "round";
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeText(label, x, ly);

      // 2. The text itself
      ctx.fillStyle = isSelected ? "#000000" : "#404040";
      ctx.fillText(label, x, ly);

      // Reset
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";
    },
    [selectedNodeId, hoveredNode]
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
        onNodeClick={(node: AnyNode) => onNodeClick(node.id)}
        onNodeHover={(node: AnyNode) => setHoveredNode(node?.id ?? null)}
        linkColor={() => "rgba(161,161,170,0.4)"}
        linkWidth={1.2}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => "rgba(0,0,0,0.6)"}
        backgroundColor="transparent"
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.2}
        cooldownTicks={100}
        onEngineStop={() => graphRef.current?.zoomToFit(400, 60)}
      />

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-zinc-200 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur-sm">
        <p className="accent mb-2 text-[9px] font-semibold text-zinc-400">
          Node types
        </p>
        <div className="flex flex-col gap-1.5">
          {LEGEND.map(({ type, label }) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{
                  backgroundColor: NODE_STYLE[type].fill,
                  border:
                    NODE_STYLE[type].stroke !== "none"
                      ? `1.5px solid ${NODE_STYLE[type].stroke}`
                      : "none",
                  outline:
                    type === "moc" ? "2px solid rgba(0,0,0,0.12)" : "none",
                  outlineOffset: "1px",
                }}
              />
              <span className="accent text-[9px] font-semibold text-zinc-500">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
