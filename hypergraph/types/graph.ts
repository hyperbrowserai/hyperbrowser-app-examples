export type NodeType = "moc" | "concept" | "pattern" | "gotcha";

/** Client-side expansion state for force-graph rendering */
export type ExpansionVisualState =
  | "initial"
  | "expanded"
  | "child"
  | "loading";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  content: string;
  links: string[];
}

/** Per-node metadata tracked in the client (not from the server graph JSON) */
export interface NodeExpansionMeta {
  state: ExpansionVisualState;
  depth: number;
  parentId: string | null;
  filePath: string;
}

export interface ExpansionHistoryEntry {
  nodeId: string;
  depth: number;
  timestamp: number;
}

export interface GraphRuntimeStats {
  totalNodes: number;
  totalLinks: number;
  maxDepth: number;
}

export interface ExpandNodeRequestBody {
  topic: string;
  nodeId: string;
  nodeContent: string;
  existingNodeIds: string[];
  parentContext: string;
  parentFilePath: string;
  parentDepth: number;
}

export interface GraphEdgePair {
  source: string;
  target: string;
}

export interface ExpandNodeResponse {
  newNodes: GraphNode[];
  newFiles: GeneratedFile[];
  parentUpdatedContent: string;
  newConnections: GraphEdgePair[];
}

export interface SkillGraph {
  topic: string;
  nodes: GraphNode[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateResponse {
  graph: SkillGraph;
  files: GeneratedFile[];
}

export interface ForceGraphNode {
  id: string;
  label: string;
  type: NodeType;
  val: number;
  expansionState?: ExpansionVisualState;
  depth?: number;
  description?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  /** Ephemeral node shown while /api/expand-node is in flight */
  isPendingPlaceholder?: boolean;
}

export interface ForceGraphLink {
  source: string;
  target: string;
  isTreeLink?: boolean;
  /** True for parent → placeholder edges during expansion */
  isPending?: boolean;
}

export interface ForceGraphData {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
}

export const NODE_COLORS: Record<NodeType, string> = {
  moc: "#000000",
  concept: "#404040",
  pattern: "#737373",
  gotcha: "#a3a3a3",
};

export const NODE_SIZES: Record<NodeType, number> = {
  moc: 3,
  concept: 2,
  pattern: 1.5,
  gotcha: 1,
};
