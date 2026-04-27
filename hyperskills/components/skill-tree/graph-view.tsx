"use client";

import { SkillTreeFile } from "@/types";
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
        const fname = f.path.split("/").pop()?.replace(".md", "").toLowerCase();
        return fname === name.toLowerCase();
      });

      if (targetFile && nodeIds.has(targetFile.path)) {
        const key = `${sourceId}→${targetFile.path}`;
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({ source: sourceId, target: targetFile.path });
        }
      }
    }
  }

  // Ensure full connectivity: BFS from hub, then wire every unreachable node to hub.
  const hub = nodes.find((n) => n.isIndex) ?? nodes[0];
  if (hub && nodes.length > 1) {
    // Build undirected adjacency for reachability
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n.id, new Set());
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
      adj.get(s)?.add(t);
      adj.get(t)?.add(s);
    }

    // BFS from hub
    const visited = new Set<string>();
    const queue = [hub.id];
    visited.add(hub.id);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const neighbor of adj.get(cur) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Connect every unreachable node (or cluster root) to the hub
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const key = `${hub.id}→${node.id}`;
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({ source: hub.id, target: node.id });
          // Mark newly reachable: BFS from this node so its cluster counts as visited
          const q2 = [node.id];
          visited.add(node.id);
          while (q2.length) {
            const c = q2.shift()!;
            for (const nb of adj.get(c) ?? []) {
              if (!visited.has(nb)) { visited.add(nb); q2.push(nb); }
            }
          }
        }
      }
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

    // 1. Definitions (Grid, Shadows, Markers)
    const defs = svg.append("defs");

    // Dotted Grid Pattern
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
      .attr("fill", "#d1d5db"); // Tailwind gray-300

    // Brutalist Drop Shadow
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

    // Arrow Markers (different offsets for index vs normal nodes)
    defs
      .append("marker")
      .attr("id", "arrow-normal")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22) // offset for r=14
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
      .attr("refX", 32) // offset for r=24
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#000");

    // 2. Background Grid
    // Put it in a group so it doesn't block pointer events for zoom
    const bgGroup = svg.append("g").style("pointer-events", "none");
    const bgRect = bgGroup
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#dotted-grid)");

    // 3. Main Container for Zoom/Pan
    // Create a background rect inside the SVG that catches all zoom/pan events
    // It must be placed BEFORE the mainGroup so it sits behind the nodes
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
        // Move the background grid pattern offset to create a panning effect
        svg.select("#dotted-grid")
          .attr("x", event.transform.x)
          .attr("y", event.transform.y)
          // Scale the pattern itself so the dots zoom in/out
          .attr("patternTransform", `scale(${event.transform.k})`);
      })
      .on("end", function () {
        select(this).style("cursor", "grab");
      });

    zoomRect.call(zoomBehavior);

    // 4. Force Simulation
    const nodesCopy: GraphNode[] = nodes.map((n) => ({ ...n }));
    const linksCopy: GraphLink[] = links.map((l) => ({ ...l }));

    const simulation = forceSimulation<GraphNode>(nodesCopy)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(linksCopy)
          .id((d) => d.id)
          .distance(160) // Increased distance between nodes
      )
      .force("charge", forceManyBody().strength(-800)) // Stronger repulsion
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius(80)) // Larger collision radius
      .force("x", forceX(width / 2).strength(0.08)) // Slightly stronger pull to center
      .force("y", forceY(height / 2).strength(0.08));

    simulationRef.current = simulation;

    // 5. Render Links
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

    // 6. Render Nodes
    const nodeGroup = mainGroup
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodesCopy)
      .join("g")
      .style("cursor", "grab");

    // Node Circle
    nodeGroup
      .append("circle")
      .attr("r", (d) => (d.isIndex ? 24 : 14))
      .attr("fill", (d) => (d.isIndex ? "#000" : groupColorMap.get(d.group) || "#fff"))
      .attr("stroke", "#000")
      .attr("stroke-width", 3)
      .attr("filter", "url(#brutalist-shadow)");

    // Node Label Background (for readability over lines)
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

    // Node Label Text
    nodeGroup
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.isIndex ? 42 : 32))
      .attr("font-size", (d) => (d.isIndex ? "13px" : "12px"))
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("fill", "#000");

    // 7. Drag Behavior
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

    // 8. Click Behavior
    nodeGroup.on("click", function (event, d) {
      if (wasDragged) {
        wasDragged = false;
        return;
      }
      onSelectFileRef.current(d.path);
    });

    // 9. Tick Updates
    simulation.on("tick", () => {
      linkElements
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // 10. Resize Handler
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

  // Update selected state
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);

    svg
      .selectAll<SVGCircleElement, GraphNode>(".nodes circle")
      .attr("fill", (d) => {
        if (d.isIndex) return d.path === selectedFile ? "#3b82f6" : "#000";
        return d.path === selectedFile ? "#000" : groupColorMap.get(d.group) || "#fff";
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
