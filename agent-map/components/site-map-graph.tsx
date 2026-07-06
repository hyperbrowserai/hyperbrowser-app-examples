import type { AgentMapEdge } from "@/lib/types";
import type { GraphPage } from "@/lib/use-map-stream";
import { compactUrl, normalizeUrl } from "@/lib/url-utils";

type SiteMapGraphProps = {
  pages: GraphPage[];
  edges: AgentMapEdge[];
};

type PositionedNode = GraphPage & {
  x: number;
  y: number;
  depth: number;
  visualRow: number;
  parentUrl?: string;
};

type LayerRow = {
  depth: number;
  visualRow: number;
  y: number;
  count: number;
  showLabel: boolean;
};

const NODE_WIDTH = 184;
const NODE_HEIGHT = 68;
const X_GAP = 30;
const Y_GAP = 46;
const PADDING = 30;
const CANVAS_WIDTH = 920;
const MIN_CANVAS_HEIGHT = 440;
const MAX_COLUMNS_PER_ROW = 4;

export function SiteMapGraph({ pages, edges }: SiteMapGraphProps) {
  const { nodes, layerRows, width, height } = layoutGraph(pages, edges);
  const nodeByUrl = new Map(nodes.map((node) => [normalizeUrl(node.url), node]));

  return (
    <section className="flex min-h-0 flex-col border border-[var(--border)] bg-[var(--panel)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          Agent map
        </h2>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--subtle)]">
          {pages.length} nodes - {edges.length} links
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto overflow-x-hidden p-3">
        {pages.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-[var(--subtle)]">
            The map will assemble from real crawled pages as Hyperbrowser visits
            them.
          </div>
        ) : (
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMin meet"
            className="block"
            role="img"
            aria-label="Crawled site map"
          >
            <defs>
              <marker
                id="edge-arrow"
                markerHeight="7"
                markerWidth="7"
                orient="auto"
                refX="6"
                refY="3.5"
              >
                <path d="M 0 0 L 7 3.5 L 0 7 z" fill="rgba(246,245,242,0.55)" />
              </marker>
            </defs>

            <g>
              {layerRows.map((row) => (
                <g key={`${row.depth}-${row.visualRow}`}>
                  <line
                    x1={PADDING}
                    x2={width - PADDING}
                    y1={row.y - 15}
                    y2={row.y - 15}
                    stroke="rgba(246,245,242,0.1)"
                    strokeDasharray="4 8"
                  />
                  {row.showLabel ? (
                    <>
                      <rect
                        x={PADDING - 8}
                        y={row.y - 38}
                        width="190"
                        height="18"
                        fill="#0A0A0A"
                        stroke="rgba(246,245,242,0.1)"
                      />
                      <text
                        x={PADDING}
                        y={row.y - 25}
                        className="font-mono"
                        fill="rgba(246,245,242,0.72)"
                        fontSize="10"
                        letterSpacing="1.5"
                      >
                        {layerLabel(row.depth, row.count)}
                      </text>
                    </>
                  ) : null}
                </g>
              ))}
            </g>

            <g
              fill="none"
              stroke="rgba(246,245,242,0.46)"
              strokeLinecap="round"
              strokeWidth="1.25"
            >
              {edges.map((edge) => {
                const source = nodeByUrl.get(normalizeUrl(edge.source));
                const target = nodeByUrl.get(normalizeUrl(edge.target));

                if (!source || !target) {
                  return null;
                }

                return (
                  <path
                    key={`${edge.source}-${edge.target}`}
                    pathLength={1}
                    className="edge-draw"
                    d={edgePath(source, target)}
                    markerEnd="url(#edge-arrow)"
                  >
                    <title>
                      {`${source.title || compactUrl(source.url)} -> ${
                        target.title || compactUrl(target.url)
                      }`}
                    </title>
                  </path>
                );
              })}
            </g>

            <g>
              {nodes.map((node) => (
                <g
                  key={node.url}
                  className="map-node node-enter"
                  transform={`translate(${node.x}, ${node.y})`}
                >
                  <title>{nodeHoverLabel(node)}</title>
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx="0"
                    fill="#0A0A0A"
                    stroke={
                      node.status === "failed"
                        ? "rgba(246,245,242,0.34)"
                        : "rgba(246,245,242,0.22)"
                    }
                    strokeDasharray={node.status === "failed" ? "4 4" : "0"}
                  />
                  <text
                    x="12"
                    y="20"
                    className="font-heading"
                    fill="#F6F5F2"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {truncate(node.title || "Untitled page", 24)}
                  </text>
                  <text
                    x="12"
                    y="39"
                    className="font-mono"
                    fill="rgba(246,245,242,0.62)"
                    fontSize="9"
                  >
                    {truncate(compactUrl(node.url), 29)}
                  </text>
                  <text
                    x="12"
                    y="56"
                    className="font-mono"
                    fill="rgba(246,245,242,0.38)"
                    fontSize="8"
                    letterSpacing="1.5"
                  >
                    {connectionLabel(node)}
                  </text>
                  {node.summary ? (
                    <circle
                      cx={NODE_WIDTH - 14}
                      cy={NODE_HEIGHT - 14}
                      r="3"
                      fill="rgba(246,245,242,0.72)"
                    />
                  ) : null}
                </g>
              ))}
            </g>
          </svg>
        )}
      </div>
    </section>
  );
}

function layoutGraph(pages: GraphPage[], edges: AgentMapEdge[]) {
  if (pages.length === 0) {
    return {
      nodes: [],
      layerRows: [],
      width: CANVAS_WIDTH,
      height: MIN_CANVAS_HEIGHT,
    };
  }

  const urls = pages.map((page) => normalizeUrl(page.url));
  const rootUrl = urls[0];
  const adjacency = new Map<string, string[]>();
  const parents = new Map<string, string>();

  for (const edge of edges) {
    const source = normalizeUrl(edge.source);
    const target = normalizeUrl(edge.target);
    adjacency.set(source, [...(adjacency.get(source) ?? []), target]);

    if (!parents.has(target)) {
      parents.set(target, source);
    }
  }

  const depths = new Map<string, number>([[rootUrl, 0]]);
  const queue = [rootUrl];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    const depth = depths.get(current) ?? 0;

    for (const target of adjacency.get(current) ?? []) {
      if (depths.has(target)) {
        continue;
      }

      depths.set(target, depth + 1);
      queue.push(target);
    }
  }

  for (const url of urls) {
    if (!depths.has(url)) {
      depths.set(url, 1);
    }
  }

  const rowsByDepth = new Map<number, GraphPage[]>();
  for (const page of pages) {
    const depth = depths.get(normalizeUrl(page.url)) ?? 0;
    rowsByDepth.set(depth, [...(rowsByDepth.get(depth) ?? []), page]);
  }
  const depthTotals = new Map(
    Array.from(rowsByDepth.entries()).map(([depth, row]) => [depth, row.length]),
  );
  const seenDepthLabels = new Set<number>();

  const rows = Array.from(rowsByDepth.entries())
    .sort(([a], [b]) => a - b)
    .flatMap(([depth, row]) =>
      chunk(row, MAX_COLUMNS_PER_ROW).map((chunkedRow) => ({
        depth,
        pages: chunkedRow,
      })),
    );

  const width = CANVAS_WIDTH;
  const height = Math.max(
    MIN_CANVAS_HEIGHT,
    PADDING * 2 + rows.length * NODE_HEIGHT + (rows.length - 1) * Y_GAP,
  );

  const nodes: PositionedNode[] = [];
  const layerRows: LayerRow[] = [];

  rows.forEach((row, visualRowIndex) => {
    const rowWidth =
      row.pages.length * NODE_WIDTH + (row.pages.length - 1) * X_GAP;
    const startX = (width - rowWidth) / 2;
    const y = PADDING + visualRowIndex * (NODE_HEIGHT + Y_GAP);

    layerRows.push({
      depth: row.depth,
      visualRow: visualRowIndex,
      y,
      count: depthTotals.get(row.depth) ?? row.pages.length,
      showLabel: !seenDepthLabels.has(row.depth),
    });
    seenDepthLabels.add(row.depth);

    row.pages.forEach((page, index) => {
      const pageUrl = normalizeUrl(page.url);

      nodes.push({
        ...page,
        x: startX + index * (NODE_WIDTH + X_GAP),
        y,
        depth: row.depth,
        visualRow: visualRowIndex,
        parentUrl: parents.get(pageUrl),
      });
    });
  });

  return { nodes, layerRows, width, height };
}

function edgePath(source: PositionedNode, target: PositionedNode) {
  const startX = source.x + NODE_WIDTH / 2;
  const startY = source.y + NODE_HEIGHT;
  const endX = target.x + NODE_WIDTH / 2;
  const endY = target.y;
  const midY = startY + (endY - startY) / 2;

  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function layerLabel(depth: number, count: number) {
  if (depth === 0) {
    return `LAYER 0 / ROOT (${count})`;
  }

  return `LAYER ${depth} / LINKED PAGES (${count})`;
}

function connectionLabel(node: PositionedNode) {
  if (node.depth === 0) {
    return node.summary ? "L0 ROOT / EXTRACT READY" : "L0 ROOT";
  }

  if (node.parentUrl) {
    return `L${node.depth} FROM ${truncate(compactUrl(node.parentUrl), 17)}`;
  }

  return `L${node.depth} DISCOVERED`;
}

function nodeHoverLabel(node: PositionedNode) {
  const lines = [
    node.title || "Untitled page",
    compactUrl(node.url),
    `Layer ${node.depth}${node.depth === 0 ? " / root" : ""}`,
    `Status: ${node.status}`,
  ];

  if (node.parentUrl) {
    lines.push(`Linked from: ${compactUrl(node.parentUrl)}`);
  }

  if (node.summary) {
    lines.push(`Purpose: ${node.summary.purpose}`);
  }

  return lines.join("\n");
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
