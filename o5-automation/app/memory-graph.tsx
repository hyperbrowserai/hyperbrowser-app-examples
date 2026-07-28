"use client";

import { useMemo, useState } from "react";
import type {
  MemoryGraphData,
  MemoryGraphEntry,
  MemoryGraphKind,
} from "@/lib/types";

interface MemoryGraphProps {
  domain: string;
  priorRuns: number;
  graph: MemoryGraphData;
  reusedEntries: string[];
  staleSelectors: string[];
}

interface Category {
  kind: MemoryGraphKind;
  label: string;
}

const CATEGORIES: Category[] = [
  { kind: "selector", label: "SELECTORS" },
  { kind: "navigation", label: "NAV PATHS" },
  { kind: "flow", label: "FLOWS" },
  { kind: "repair", label: "REPAIRS" },
  { kind: "structure", label: "STRUCTURE" },
  { kind: "environment", label: "ENV FACTS" },
];

const WIDTH = 1320;
const ROOT_WIDTH = 260;
const ROOT_HEIGHT = 58;
const CATEGORY_WIDTH = 178;
const CATEGORY_HEIGHT = 46;
const LEAF_WIDTH = 178;
const LEAF_HEIGHT = 48;
const CATEGORY_Y = 116;
const LEAF_Y = 208;
const LEAF_GAP = 12;
const MAX_VISIBLE_PER_CATEGORY = 4;

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

/** Wrap graph labels by rendered-friendly chunks, preserving the full tooltip. */
function labelLines(value: string, lineLength = 24): string[] {
  if (value.length <= lineLength) return [value];
  const firstBreak = Math.max(
    value.lastIndexOf(" ", lineLength),
    value.lastIndexOf("/", lineLength),
    value.lastIndexOf(">", lineLength)
  );
  const splitAt = firstBreak > lineLength * 0.55 ? firstBreak + 1 : lineLength;
  const first = value.slice(0, splitAt).trim();
  const rest = value.slice(splitAt).trim();
  return [first, truncate(rest, lineLength)];
}

function categoryX(index: number) {
  const gap = (WIDTH - CATEGORIES.length * CATEGORY_WIDTH) / (CATEGORIES.length + 1);
  return gap + index * (CATEGORY_WIDTH + gap);
}

function edgePath(sourceX: number, sourceY: number, targetX: number, targetY: number) {
  const middle = sourceY + (targetY - sourceY) * 0.52;
  return `M ${sourceX} ${sourceY} C ${sourceX} ${middle}, ${targetX} ${middle}, ${targetX} ${targetY}`;
}

function nodeStatus(
  entry: MemoryGraphEntry,
  reused: Set<string>,
  stale: Set<string>
): "reused" | "stale" | "known" {
  if (entry.kind === "selector" && stale.has(entry.label)) return "stale";
  if (reused.has(entry.label)) return "reused";
  return "known";
}

export function MemoryGraph({
  domain,
  priorRuns,
  graph,
  reusedEntries,
  staleSelectors,
}: MemoryGraphProps) {
  const reused = useMemo(() => new Set(reusedEntries), [reusedEntries]);
  const stale = useMemo(() => new Set(staleSelectors), [staleSelectors]);
  const grouped = useMemo(
    () =>
      new Map(
        CATEGORIES.map((category) => [
          category.kind,
          graph.entries.filter((entry) => entry.kind === category.kind),
        ])
      ),
    [graph]
  );
  const [selected, setSelected] = useState<MemoryGraphEntry | null>(null);
  const maxLeaves = Math.max(
    1,
    ...CATEGORIES.map((category) =>
      Math.min((grouped.get(category.kind) ?? []).length, MAX_VISIBLE_PER_CATEGORY)
    )
  );
  const height = LEAF_Y + maxLeaves * (LEAF_HEIGHT + LEAF_GAP) + 20;

  return (
    <div className="memory-graph">
      <div className="memory-graph-head">
        <span>NAVIGATION MEMORY GRAPH</span>
        <span>{graph.entries.length} NODES · {CATEGORIES.length + graph.entries.length + 1} TOTAL</span>
      </div>
      <div className="memory-graph-canvas">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="img"
          aria-label={`Navigation memory graph for ${domain}`}
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            <marker
              id="memory-arrow"
              markerHeight="7"
              markerWidth="7"
              orient="auto"
              refX="6"
              refY="3.5"
            >
              <path d="M 0 0 L 7 3.5 L 0 7 z" fill="rgba(246,245,242,.42)" />
            </marker>
            <pattern id="memory-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(246,245,242,.045)" />
            </pattern>
          </defs>

          <rect width={WIDTH} height={height} fill="url(#memory-grid)" />

          <g
            className="memory-graph-edges"
            fill="none"
            stroke="rgba(246,245,242,.28)"
            strokeWidth="1.1"
            markerEnd="url(#memory-arrow)"
          >
            {CATEGORIES.map((category, index) => {
              const x = categoryX(index);
              return (
                <path
                  className="memory-edge-enter"
                  key={`root-${category.kind}`}
                  d={edgePath(
                    WIDTH / 2,
                    24 + ROOT_HEIGHT,
                    x + CATEGORY_WIDTH / 2,
                    CATEGORY_Y
                  )}
                />
              );
            })}
            {CATEGORIES.flatMap((category, categoryIndex) => {
              const entries = (grouped.get(category.kind) ?? []).slice(
                0,
                MAX_VISIBLE_PER_CATEGORY
              );
              const x = categoryX(categoryIndex);
              return entries.map((entry, entryIndex) => (
                <path
                  className="memory-edge-enter"
                  key={`${category.kind}-${entry.id}`}
                  d={edgePath(
                    x + CATEGORY_WIDTH / 2,
                    CATEGORY_Y + CATEGORY_HEIGHT,
                    x + LEAF_WIDTH / 2,
                    LEAF_Y + entryIndex * (LEAF_HEIGHT + LEAF_GAP)
                  )}
                />
              ));
            })}
          </g>

          <g className="memory-node memory-node-root" transform={`translate(${(WIDTH - ROOT_WIDTH) / 2}, 24)`}>
            <rect width={ROOT_WIDTH} height={ROOT_HEIGHT} />
            <text x="14" y="24">{truncate(domain, 34)}</text>
            <text className="memory-node-meta" x="14" y="43">
              DOMAIN · {priorRuns} PRIOR RUN{priorRuns === 1 ? "" : "S"}
            </text>
          </g>

          {CATEGORIES.map((category, categoryIndex) => {
            const entries = grouped.get(category.kind) ?? [];
            const x = categoryX(categoryIndex);
            return (
              <g key={category.kind}>
                <g
                  className={`memory-node memory-node-category ${entries.length ? "" : "empty"}`}
                  transform={`translate(${x}, ${CATEGORY_Y})`}
                >
                  <rect width={CATEGORY_WIDTH} height={CATEGORY_HEIGHT} />
                  <text x="12" y="20">{category.label}</text>
                  <text className="memory-node-meta" x="12" y="36">
                    {entries.length} ENTR{entries.length === 1 ? "Y" : "IES"}
                  </text>
                </g>

                {entries.slice(0, MAX_VISIBLE_PER_CATEGORY).map((entry, entryIndex) => {
                  const status = nodeStatus(entry, reused, stale);
                  const y = LEAF_Y + entryIndex * (LEAF_HEIGHT + LEAF_GAP);
                  const lines = labelLines(entry.label);
                  return (
                    <g
                      className={`memory-node memory-node-leaf ${status} ${selected?.id === entry.id ? "selected" : ""}`}
                      key={entry.id}
                      transform={`translate(${x}, ${y})`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(entry)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") setSelected(entry);
                      }}
                    >
                      <title>{`${entry.label}\n${entry.detail}`}</title>
                      <rect width={LEAF_WIDTH} height={LEAF_HEIGHT} />
                      <text className="memory-leaf-label" x="11" y={lines.length === 1 ? 21 : 15}>
                        {lines.map((line, lineIndex) => (
                          <tspan x="11" dy={lineIndex === 0 ? 0 : 11} key={`${entry.id}-${lineIndex}`}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                      <text className="memory-node-meta" x="11" y="41">
                        {status === "reused"
                          ? "REUSED THIS RUN"
                          : status === "stale"
                            ? "STALE · RE-DERIVED"
                            : entry.reused
                              ? `${entry.reused} PRIOR REUSE${entry.reused === 1 ? "" : "S"}`
                              : "REMEMBERED"}
                      </text>
                    </g>
                  );
                })}

                {entries.length > MAX_VISIBLE_PER_CATEGORY ? (
                  <text
                    className="memory-overflow"
                    x={x + LEAF_WIDTH / 2}
                    y={LEAF_Y + MAX_VISIBLE_PER_CATEGORY * (LEAF_HEIGHT + LEAF_GAP) - 2}
                    textAnchor="middle"
                  >
                    + {entries.length - MAX_VISIBLE_PER_CATEGORY} MORE
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="memory-graph-inspector">
        {selected ? (
          <>
            <span>{selected.kind.toUpperCase()}</span>
            <strong>{selected.label}</strong>
            <p>{selected.detail}</p>
          </>
        ) : (
          <p>Select a memory node to inspect what the agent learned.</p>
        )}
      </div>
    </div>
  );
}
