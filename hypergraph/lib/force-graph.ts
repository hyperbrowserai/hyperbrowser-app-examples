import type {
  ForceGraphData,
  ForceGraphNode,
  NodeExpansionMeta,
  SkillGraph,
} from "@/types/graph";
import { NODE_SIZES } from "@/types/graph";

/** Shown immediately when user clicks Go Deeper (before API returns). */
export const EXPANSION_PLACEHOLDER_COUNT = 5;

export function pendingPlaceholderId(parentId: string, index: number): string {
  return `__hb_pending_${parentId}_${index}`;
}

function isTreeLink(
  treeEdges: Set<string>,
  source: string,
  target: string
): boolean {
  return (
    treeEdges.has(`${source}->${target}`) ||
    treeEdges.has(`${target}->${source}`)
  );
}

export function buildForceGraphData(
  graph: SkillGraph,
  nodeMeta: Record<string, NodeExpansionMeta>,
  treeEdges: Set<string>,
  bloom: { childIds: string[]; x: number; y: number } | null,
  pendingExpansion: { parentId: string; x: number; y: number } | null
): ForceGraphData {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const linkSet = new Set<string>();
  const links: ForceGraphData["links"] = [];

  for (const node of graph.nodes) {
    for (const target of node.links) {
      if (!nodeIds.has(target)) continue;
      const key = [node.id, target].sort().join("::");
      if (!linkSet.has(key)) {
        linkSet.add(key);
        links.push({
          source: node.id,
          target,
          isTreeLink: isTreeLink(treeEdges, node.id, target),
        });
      }
    }
  }

  const nodes: ForceGraphNode[] = graph.nodes.map((n) => {
    const meta = nodeMeta[n.id];
    const base = {
      id: n.id,
      label: n.label,
      type: n.type,
      val: NODE_SIZES[n.type] + Math.min(n.links.length * 0.5, 4),
      expansionState: meta?.state,
      depth: meta?.depth ?? 0,
      description: n.description,
    };
    if (bloom && bloom.childIds.includes(n.id)) {
      return {
        ...base,
        x: bloom.x,
        y: bloom.y,
        vx: 0,
        vy: 0,
      };
    }
    return base;
  });

  if (pendingExpansion && nodeIds.has(pendingExpansion.parentId)) {
    const { parentId, x: px, y: py } = pendingExpansion;
    const parentDepth = nodeMeta[parentId]?.depth ?? 0;
    const ringR = 48;
    for (let i = 0; i < EXPANSION_PLACEHOLDER_COUNT; i++) {
      const angle = (2 * Math.PI * i) / EXPANSION_PLACEHOLDER_COUNT - Math.PI / 2;
      const id = pendingPlaceholderId(parentId, i);
      nodes.push({
        id,
        label: "···",
        type: "concept",
        val: 1.15,
        expansionState: "loading",
        depth: parentDepth + 1,
        description: "Generating sub-concepts from documentation…",
        isPendingPlaceholder: true,
        x: px + Math.cos(angle) * ringR,
        y: py + Math.sin(angle) * ringR,
        vx: 0,
        vy: 0,
      });
      links.push({
        source: parentId,
        target: id,
        isTreeLink: true,
        isPending: true,
      });
    }
  }

  return { nodes, links };
}

export function countUndirectedLinks(graph: SkillGraph): number {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const linkSet = new Set<string>();
  for (const node of graph.nodes) {
    for (const target of node.links) {
      if (!nodeIds.has(target)) continue;
      const key = [node.id, target].sort().join("::");
      linkSet.add(key);
    }
  }
  return linkSet.size;
}

export function maxDepthOf(meta: Record<string, NodeExpansionMeta>): number {
  return Math.max(0, ...Object.values(meta).map((m) => m.depth));
}

export function buildInitialNodeMeta(
  graph: SkillGraph,
  topicSlug: string
): Record<string, NodeExpansionMeta> {
  const meta: Record<string, NodeExpansionMeta> = {};
  for (const n of graph.nodes) {
    meta[n.id] = {
      state: "initial",
      depth: 0,
      parentId: null,
      filePath: `${topicSlug}/${n.id}.md`,
    };
  }
  return meta;
}
