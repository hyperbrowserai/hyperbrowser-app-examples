"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { select } from "d3-selection";
import { drag } from "d3-drag";
import { zoom } from "d3-zoom";
import type { Memory } from "@/lib/types";

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  kind: "root" | "category" | "item";
  value?: string;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

const GRAYSCALE_PALETTE = ["#ffffff", "#f3f4f6", "#e5e7eb", "#d1d5db", "#9ca3af"];

function addCategory(
  nodes: GraphNode[],
  links: GraphLink[],
  id: string,
  label: string,
  value: string,
  items: Array<{ label: string; value?: string }>,
) {
  nodes.push({ id, label, value, kind: "category" });
  links.push({ source: "root", target: id });

  items.forEach((item, index) => {
    const itemId = `${id}-${index}`;
    nodes.push({ id: itemId, label: item.label, value: item.value, kind: "item" });
    links.push({ source: id, target: itemId });
  });
}

function buildGraph(memory: Memory) {
  const nodes: GraphNode[] = [
    { id: "root", label: memory.domain, value: memory.pageType, kind: "root" },
  ];
  const links: GraphLink[] = [];

  addCategory(nodes, links, "purpose", "Purpose", "summary", [
    { label: memory.purpose, value: memory.url },
  ]);
  addCategory(
    nodes,
    links,
    "layout",
    "Layout",
    `${memory.layout.length} sections`,
    memory.layout.map((section) => ({ label: section })),
  );
  addCategory(
    nodes,
    links,
    "elements",
    "Key Elements",
    `${memory.keyElements.length} detected`,
    memory.keyElements.map((element) => ({
      label: element.label,
      value: [element.type, element.location, element.leadsTo].filter(Boolean).join(" / "),
    })),
  );

  if (memory.navigation.length > 0) {
    addCategory(
      nodes,
      links,
      "navigation",
      "Navigation",
      `${memory.navigation.length} paths`,
      memory.navigation.map((item) => ({ label: item.label, value: item.href })),
    );
  }

  addCategory(
    nodes,
    links,
    "actions",
    "Agent Actions",
    `${memory.actions.length} possible`,
    memory.actions.map((action) => ({ label: action })),
  );

  if (memory.notes) {
    addCategory(nodes, links, "notes", "Notes", "gotchas", [
      { label: memory.notes },
    ]);
  }

  return { nodes, links };
}

export function MemoryTree({ memory, animate }: { memory: Memory; animate: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const { nodes, links } = useMemo(() => buildGraph(memory), [memory]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 520;
    const svg = select(svgRef.current);

    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const defs = svg.append("defs");
    defs
      .append("pattern")
      .attr("id", "memory-dotted-grid")
      .attr("width", 24)
      .attr("height", 24)
      .attr("patternUnits", "userSpaceOnUse")
      .append("circle")
      .attr("cx", 2)
      .attr("cy", 2)
      .attr("r", 1.5)
      .attr("fill", "#d1d5db");

    const filter = defs
      .append("filter")
      .attr("id", "memory-brutalist-shadow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "150%")
      .attr("height", "150%");
    filter
      .append("feDropShadow")
      .attr("dx", 4)
      .attr("dy", 4)
      .attr("stdDeviation", 0)
      .attr("flood-color", "#000")
      .attr("flood-opacity", 1);

    defs
      .append("marker")
      .attr("id", "memory-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#000");

    svg
      .append("g")
      .style("pointer-events", "none")
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#memory-dotted-grid)");

    const zoomRect = svg
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "transparent")
      .style("cursor", "grab");
    const mainGroup = svg.append("g").attr("class", "main-group");

    const zoomBehavior = zoom<SVGRectElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("start", function () {
        select(this).style("cursor", "grabbing");
      })
      .on("zoom", (event) => {
        mainGroup.attr("transform", event.transform);
        svg
          .select("#memory-dotted-grid")
          .attr("x", event.transform.x)
          .attr("y", event.transform.y)
          .attr("patternTransform", `scale(${event.transform.k})`);
      })
      .on("end", function () {
        select(this).style("cursor", "grab");
      });

    zoomRect.call(zoomBehavior);

    const nodesCopy: GraphNode[] = nodes.map((node) => ({ ...node }));
    const linksCopy: GraphLink[] = links.map((link) => ({ ...link }));

    const simulation = forceSimulation<GraphNode>(nodesCopy)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(linksCopy)
          .id((node) => node.id)
          .distance((link) => {
            const source = link.source as GraphNode;
            return source.kind === "root" ? 160 : 120;
          }),
      )
      .force("charge", forceManyBody().strength(-650))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius(74))
      .force("x", forceX(width / 2).strength(0.07))
      .force("y", forceY(height / 2).strength(0.07));

    const linkElements = mainGroup
      .append("g")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(linksCopy)
      .join("line")
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#memory-arrow)");

    const nodeGroup = mainGroup
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodesCopy)
      .join("g")
      .style("cursor", "grab");

    nodeGroup
      .append("circle")
      .attr("r", (node) => (node.kind === "root" ? 26 : node.kind === "category" ? 18 : 13))
      .attr("fill", (node, index) =>
        node.kind === "root" ? "#000" : GRAYSCALE_PALETTE[index % GRAYSCALE_PALETTE.length],
      )
      .attr("stroke", "#000")
      .attr("stroke-width", 3)
      .attr("filter", "url(#memory-brutalist-shadow)");

    nodeGroup
      .append("text")
      .text((node) => node.label)
      .attr("text-anchor", "middle")
      .attr("dy", (node) => (node.kind === "root" ? 46 : node.kind === "category" ? 36 : 30))
      .attr("font-size", (node) => (node.kind === "root" ? "13px" : "11px"))
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("stroke", "#fff")
      .attr("stroke-width", 4)
      .attr("stroke-linejoin", "round")
      .attr("paint-order", "stroke fill");

    nodeGroup
      .append("text")
      .text((node) => node.label)
      .attr("text-anchor", "middle")
      .attr("dy", (node) => (node.kind === "root" ? 46 : node.kind === "category" ? 36 : 30))
      .attr("font-size", (node) => (node.kind === "root" ? "13px" : "11px"))
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("fill", "#000");

    let wasDragged = false;
    const dragBehavior = drag<SVGGElement, GraphNode>()
      .on("start", function (event, node) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        node.fx = node.x;
        node.fy = node.y;
        wasDragged = false;
        select(this).style("cursor", "grabbing");
      })
      .on("drag", function (event, node) {
        node.fx = event.x;
        node.fy = event.y;
        wasDragged = true;
      })
      .on("end", function (event, node) {
        if (!event.active) simulation.alphaTarget(0);
        node.fx = null;
        node.fy = null;
        select(this).style("cursor", "grab");
      });

    nodeGroup.call(dragBehavior);
    nodeGroup.on("click", (event, node) => {
      if (wasDragged) {
        wasDragged = false;
        return;
      }
      event.stopPropagation();
      setSelectedNode(node);
    });

    simulation.on("tick", () => {
      linkElements
        .attr("x1", (link) => (link.source as GraphNode).x ?? 0)
        .attr("y1", (link) => (link.source as GraphNode).y ?? 0)
        .attr("x2", (link) => (link.target as GraphNode).x ?? 0)
        .attr("y2", (link) => (link.target as GraphNode).y ?? 0);

      nodeGroup.attr("transform", (node) => `translate(${node.x ?? 0},${node.y ?? 0})`);
    });

    const handleResize = () => {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight || 520;
      svg.attr("viewBox", `0 0 ${nextWidth} ${nextHeight}`);
      simulation.force("center", forceCenter(nextWidth / 2, nextHeight / 2));
      simulation.alpha(0.3).restart();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      simulation.stop();
      window.removeEventListener("resize", handleResize);
    };
  }, [nodes, links]);

  return (
    <div className="border border-white/10 bg-black">
      <div className="flex items-center justify-between border-b border-white/10 bg-black p-4">
        <div>
          <h3 className="font-mono text-xs text-white/60">Memory Graph</h3>
          <p className="mt-1 text-xs text-white/35">Drag nodes. Scroll to zoom. Built from learned memory.</p>
        </div>
        <span className="font-mono text-[10px] text-white/30">
          {nodes.length} nodes / {links.length} links
        </span>
      </div>
      <div className="border-4 border-black bg-white shadow-[4px_4px_0_#000]">
        <div
          ref={containerRef}
          className="relative h-[520px] min-h-[520px] overflow-hidden bg-white"
        >
          <svg
            ref={svgRef}
            className={`absolute inset-0 h-full w-full ${animate ? "animate-in fade-in duration-500" : ""}`}
            style={{ display: "block" }}
          />
        </div>
        <div className="flex min-h-[64px] items-center justify-between gap-4 border-t-4 border-black bg-white px-4 py-3 text-black">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase">
              {selectedNode?.label ?? "Select a node"}
            </p>
            <p className="mt-1 truncate text-sm text-black/60">
              {selectedNode?.value ?? "Click any node to inspect the memory detail behind it."}
            </p>
          </div>
          {selectedNode && (
            <button
              onClick={() => setSelectedNode(null)}
              className="font-mono border-2 border-black px-3 py-1 text-[10px] font-bold uppercase hover:bg-black hover:text-white"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
