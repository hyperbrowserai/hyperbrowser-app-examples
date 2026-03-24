"use client";

import { SkillTreeFile } from "@/lib/types";
import { useEffect, useRef, useMemo } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
} from "d3-force";
import { select } from "d3-selection";
import { drag } from "d3-drag";
import { zoom } from "d3-zoom";

interface GraphViewProps {
  files: SkillTreeFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

interface GraphNode extends SimulationNodeDatum {
  id: string;
  path: string;
  label: string;
  group: string;
  isIndex: boolean;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

function extractLinksFromContent(content: string): string[] {
  const links: string[] = [];

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const linksMatch = frontmatterMatch[1].match(/links:\s*\[([^\]]*)\]/);
    if (linksMatch) {
      const parsed = linksMatch[1]
        .split(",")
        .map((l) => l.trim().replace(/['"]/g, ""))
        .filter(Boolean);
      links.push(...parsed);
    }
  }

  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    if (!links.includes(match[1])) {
      links.push(match[1]);
    }
  }

  return links;
}

const GRAYSCALE_PALETTE = [
  "#ffffff",
  "#f3f4f6",
  "#e5e7eb",
  "#d1d5db",
  "#9ca3af",
  "#6b7280",
];

function buildGraph(files: SkillTreeFile[]) {
  const groups = new Set<string>();
  const nodes: GraphNode[] = files.map((f) => {
    const parts = f.path.split("/");
    const group = parts.length > 1 ? parts[0] : "_root";
    groups.add(group);
    const label = parts[parts.length - 1].replace(".md", "");
    return {
      id: f.path,
      path: f.path,
      label,
      group,
      isIndex: f.path === "index.md",
    };
  });

  const groupArray = Array.from(groups);
  const groupColorMap = new Map<string, string>();
  groupArray.forEach((g, i) => {
    groupColorMap.set(g, GRAYSCALE_PALETTE[i % GRAYSCALE_PALETTE.length]);
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  const linkSet = new Set<string>();
  const links: GraphLink[] = [];

  for (const file of files) {
    const sourceId = file.path;
    const linkedNames = extractLinksFromContent(file.content);

    for (const name of linkedNames) {
      const targetFile = files.find((f) => {
        const fname = f.path
          .split("/")
          .pop()
          ?.replace(".md", "")
          .toLowerCase();
        return fname === name.toLowerCase();
      });

      if (targetFile && nodeIds.has(targetFile.path)) {
        const key = `${sourceId}->${targetFile.path}`;
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({ source: sourceId, target: targetFile.path });
        }
      }
    }
  }

  const hasOutgoingFromIndex = links.some((l) => l.source === "index.md");
  if (!hasOutgoingFromIndex && nodeIds.has("index.md")) {
    const hasIncoming = new Set(links.map((l) => l.target));
    const roots = nodes.filter(
      (n) => n.id !== "index.md" && !hasIncoming.has(n.id)
    );

    if (roots.length > 0) {
      roots.forEach((r) => links.push({ source: "index.md", target: r.id }));
    } else {
      const groupReps = new Map();
      nodes.forEach((n) => {
        if (n.id !== "index.md" && !groupReps.has(n.group)) {
          groupReps.set(n.group, n.id);
        }
      });
      groupReps.forEach((targetId) =>
        links.push({ source: "index.md", target: targetId })
      );
    }
  }

  return { nodes, links, groupColorMap };
}

export default function GraphView({
  files,
  selectedFile,
  onSelectFile,
}: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);

  const { nodes, links, groupColorMap } = useMemo(
    () => buildGraph(files),
    [files]
  );

  const onSelectFileRef = useRef(onSelectFile);
  onSelectFileRef.current = onSelectFile;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 500;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    defs
      .append("pattern")
      .attr("id", "dotted-grid")
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
      .attr("id", "brutalist-shadow")
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
      .attr("id", "arrow-normal")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#000");

    defs
      .append("marker")
      .attr("id", "arrow-index")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 32)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#000");

    svg.append("g").style("pointer-events", "none")
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#dotted-grid)");

    const zoomRect = svg
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "transparent")
      .style("cursor", "grab");

    const mainGroup = svg.append("g").attr("class", "main-group");

    const zoomBehavior = zoom<SVGRectElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("start", function () {
        select(this).style("cursor", "grabbing");
      })
      .on("zoom", (event) => {
        mainGroup.attr("transform", event.transform);
        svg
          .select("#dotted-grid")
          .attr("x", event.transform.x)
          .attr("y", event.transform.y)
          .attr("patternTransform", `scale(${event.transform.k})`);
      })
      .on("end", function () {
        select(this).style("cursor", "grab");
      });

    zoomRect.call(zoomBehavior);

    const nodesCopy: GraphNode[] = nodes.map((n) => ({ ...n }));
    const linksCopy: GraphLink[] = links.map((l) => ({ ...l }));

    const simulation = forceSimulation<GraphNode>(nodesCopy)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(linksCopy)
          .id((d) => d.id)
          .distance(160)
      )
      .force("charge", forceManyBody().strength(-800))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius(80))
      .force("x", forceX(width / 2).strength(0.08))
      .force("y", forceY(height / 2).strength(0.08));

    simulationRef.current = simulation;

    const linkElements = mainGroup
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(linksCopy)
      .join("line")
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("marker-end", (d) =>
        (d.target as GraphNode).isIndex
          ? "url(#arrow-index)"
          : "url(#arrow-normal)"
      );

    const nodeGroup = mainGroup
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodesCopy)
      .join("g")
      .style("cursor", "grab");

    nodeGroup
      .append("circle")
      .attr("r", (d) => (d.isIndex ? 24 : 14))
      .attr("fill", (d) =>
        d.isIndex ? "#000" : groupColorMap.get(d.group) || "#fff"
      )
      .attr("stroke", "#000")
      .attr("stroke-width", 3)
      .attr("filter", "url(#brutalist-shadow)");

    nodeGroup
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.isIndex ? 42 : 32))
      .attr("font-size", (d) => (d.isIndex ? "13px" : "12px"))
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("stroke", "#fff")
      .attr("stroke-width", 4)
      .attr("stroke-linejoin", "round")
      .attr("paint-order", "stroke fill");

    nodeGroup
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.isIndex ? 42 : 32))
      .attr("font-size", (d) => (d.isIndex ? "13px" : "12px"))
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("fill", "#000");

    let wasDragged = false;

    const dragBehavior = drag<SVGGElement, GraphNode>()
      .on("start", function (event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        wasDragged = false;
        select(this).style("cursor", "grabbing");
      })
      .on("drag", function (event, d) {
        d.fx = event.x;
        d.fy = event.y;
        wasDragged = true;
      })
      .on("end", function (event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        select(this).style("cursor", "grab");
      });

    nodeGroup.call(dragBehavior);

    nodeGroup.on("click", function (event, d) {
      if (wasDragged) {
        wasDragged = false;
        return;
      }
      onSelectFileRef.current(d.path);
    });

    simulation.on("tick", () => {
      linkElements
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight || 500;
      svg.attr("viewBox", `0 0 ${w} ${h}`);
      simulation.force("center", forceCenter(w / 2, h / 2));
      simulation.alpha(0.3).restart();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      simulation.stop();
      simulationRef.current = null;
      window.removeEventListener("resize", handleResize);
    };
  }, [nodes, links, groupColorMap]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);

    svg
      .selectAll<SVGCircleElement, GraphNode>(".nodes circle")
      .attr("fill", (d) => {
        if (d.isIndex) return d.path === selectedFile ? "#3b82f6" : "#000";
        return d.path === selectedFile
          ? "#000"
          : groupColorMap.get(d.group) || "#fff";
      });
  }, [selectedFile, groupColorMap]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] bg-white relative overflow-hidden"
    >
      <svg
        ref={svgRef}
        className="w-full h-full absolute inset-0"
        style={{ display: "block" }}
      />
    </div>
  );
}
