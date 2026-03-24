"use client";

import { DiscoveryNode } from "@/lib/types";
import { useEffect, useRef, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
} from "d3-force";
import { select } from "d3-selection";

interface DiscoveryGraphProps {
  topic: string;
  nodes: DiscoveryNode[];
  isGenerating: boolean;
}

interface DNode extends SimulationNodeDatum {
  id: string;
  label: string;
  isCenter: boolean;
  isNewest: boolean;
}

interface DLink extends SimulationLinkDatum<DNode> {
  source: string | DNode;
  target: string | DNode;
}

function renderTick(
  svgRef: React.RefObject<SVGSVGElement | null>,
  dNodes: DNode[],
  dLinks: DLink[]
) {
  const svg = select(svgRef.current!);

  svg
    .select(".links")
    .selectAll<SVGLineElement, DLink>("line")
    .data(dLinks)
    .join(
      (enter) => {
        const line = enter
          .append("line")
          .attr("stroke", "#333")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "6 4")
          .style("opacity", "0")
          .style("transition", "opacity 500ms ease");
        requestAnimationFrame(() => {
          line.style("opacity", "1");
        });
        return line;
      },
      (update) => update,
      (exit) => exit.remove()
    )
    .attr("x1", (d) => (d.source as DNode).x!)
    .attr("y1", (d) => (d.source as DNode).y!)
    .attr("x2", (d) => (d.target as DNode).x!)
    .attr("y2", (d) => (d.target as DNode).y!);

  const nodeGroups = svg
    .select(".nodes")
    .selectAll<SVGGElement, DNode>("g.node")
    .data(dNodes, (d) => d.id)
    .join(
      (enter) => {
        const g = enter
          .append("g")
          .attr("class", "node")
          .style("opacity", 0);

        g.filter((d) => !d.isCenter)
          .append("circle")
          .attr("class", "pulse-ring")
          .attr("r", 16)
          .attr("fill", "none")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5)
          .style("opacity", 0);

        g.append("circle")
          .attr("class", "node-circle")
          .attr("r", (d) => (d.isCenter ? 28 : 14))
          .attr("fill", (d) => (d.isCenter ? "#fff" : "#1a1a1a"))
          .attr("stroke", (d) => (d.isCenter ? "#fff" : "#666"))
          .attr("stroke-width", (d) => (d.isCenter ? 3 : 2));

        g.append("text")
          .text((d) => d.label)
          .attr("text-anchor", "middle")
          .attr("dy", (d) => (d.isCenter ? 48 : 32))
          .attr("font-size", (d) => (d.isCenter ? "13px" : "10px"))
          .attr("font-family", "monospace")
          .attr("font-weight", "bold")
          .attr("fill", "#777");

        g.style("transition", "opacity 700ms ease");
        requestAnimationFrame(() => {
          g.style("opacity", "1");
        });

        return g;
      },
      (update) => {
        update
          .select(".pulse-ring")
          .style("opacity", (d) => (d.isNewest ? "1" : "0"));

        update
          .select(".node-circle")
          .style("transition", "stroke 300ms ease, fill 300ms ease")
          .attr("stroke", (d) =>
            d.isCenter ? "#fff" : d.isNewest ? "#fff" : "#666"
          )
          .attr("fill", (d) =>
            d.isCenter ? "#fff" : d.isNewest ? "#333" : "#1a1a1a"
          );

        return update;
      },
      (exit) => exit.remove()
    );

  nodeGroups.attr("transform", (d) => `translate(${d.x},${d.y})`);
}

export default function DiscoveryGraph({
  topic,
  nodes,
  isGenerating,
}: DiscoveryGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<Simulation<DNode, DLink> | null>(null);
  const prevNodeCountRef = useRef(0);

  const buildData = useCallback((): { nodes: DNode[]; links: DLink[] } => {
    const newestId = nodes.length > 0 ? nodes[nodes.length - 1].id : null;

    const center: DNode = {
      id: "__center__",
      label: topic.length > 24 ? topic.slice(0, 22) + "…" : topic,
      isCenter: true,
      isNewest: false,
    };

    const dNodes: DNode[] = [center];
    const dLinks: DLink[] = [];

    nodes.forEach((n, i) => {
      const label =
        n.title.length > 32 ? n.title.slice(0, 30) + "…" : n.title;
      dNodes.push({
        id: n.id,
        label,
        isCenter: false,
        isNewest: n.id === newestId,
      });
      dLinks.push({ source: "__center__", target: n.id });

      if (i > 0) {
        dLinks.push({ source: nodes[i - 1].id, target: n.id });
      }
    });

    return { nodes: dNodes, links: dLinks };
  }, [topic, nodes]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 500;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const defs = svg.append("defs");

    defs
      .append("pattern")
      .attr("id", "disc-grid")
      .attr("width", 20)
      .attr("height", 20)
      .attr("patternUnits", "userSpaceOnUse")
      .append("circle")
      .attr("cx", 1)
      .attr("cy", 1)
      .attr("r", 0.8)
      .attr("fill", "#282828");

    svg
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "#0a0a0a");

    svg
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#disc-grid)");

    const mainGroup = svg.append("g").attr("class", "main");
    mainGroup.append("g").attr("class", "links");
    mainGroup.append("g").attr("class", "nodes");

    const { nodes: dNodes, links: dLinks } = buildData();

    const simulation = forceSimulation<DNode>(dNodes)
      .force(
        "link",
        forceLink<DNode, DLink>(dLinks)
          .id((d) => d.id)
          .distance(130)
      )
      .force("charge", forceManyBody().strength(-500))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius(55));

    simulationRef.current = simulation;
    prevNodeCountRef.current = nodes.length;

    simulation.on("tick", () => renderTick(svgRef, dNodes, dLinks));

    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [buildData]);

  useEffect(() => {
    if (!simulationRef.current || !svgRef.current) return;
    if (nodes.length === prevNodeCountRef.current) return;

    const simulation = simulationRef.current;
    const { nodes: dNodes, links: dLinks } = buildData();

    simulation.nodes(dNodes);
    simulation.force(
      "link",
      forceLink<DNode, DLink>(dLinks)
        .id((d) => d.id)
        .distance(130)
    );

    simulation.alpha(0.6).restart();
    prevNodeCountRef.current = nodes.length;

    simulation.on("tick", () => renderTick(svgRef, dNodes, dLinks));
  }, [nodes.length, buildData]);

  return (
    <div className="flex flex-col h-full border-4 border-black shadow-brutal bg-[#0a0a0a] overflow-hidden">
      {/* Inline SVG animation styles */}
      <style>{`
        @keyframes pulse-ring {
          0% { r: 14; opacity: 0.8; }
          100% { r: 28; opacity: 0; }
        }
        .pulse-ring {
          animation: pulse-ring 1.8s ease-out infinite;
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -20; }
        }
        .links line {
          animation: dash-flow 1.2s linear infinite;
        }
      `}</style>

      <div className="flex items-center justify-between px-4 py-3 border-b-4 border-black bg-black text-white">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {isGenerating
              ? "Generating skill files..."
              : nodes.length > 0
                ? `Discovering — ${nodes.length} page${nodes.length !== 1 ? "s" : ""} found`
                : "Searching documentation..."}
          </span>
        </div>
        {nodes.length > 0 && !isGenerating && (
          <span className="text-[10px] font-mono text-gray-600 tracking-wide">
            LIVE
          </span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 relative min-h-0">
        <svg
          ref={svgRef}
          className="w-full h-full absolute inset-0"
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
}
