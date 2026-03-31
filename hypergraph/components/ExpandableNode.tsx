import type { ExpansionVisualState, NodeType } from "@/types/graph";

/** Canvas styling helpers for expansion-aware nodes (used by GraphView). */

export function expansionRingColor(state: ExpansionVisualState | undefined): string {
  switch (state) {
    case "loading":
      return "rgba(24,24,27,0.35)";
    case "expanded":
      return "rgba(24,24,27,0.55)";
    case "child":
      return "rgba(113,113,122,0.45)";
    default:
      return "rgba(161,161,170,0.35)";
  }
}

export function nodeBaseFill(
  type: NodeType,
  state: ExpansionVisualState | undefined,
  isSelected: boolean
): { fill: string; stroke: string; strokeW: number } {
  if (isSelected) {
    return { fill: "#ffffff", stroke: "#000000", strokeW: 2 };
  }
  if (state === "expanded") {
    return { fill: "#18181b", stroke: "#000000", strokeW: 0 };
  }
  if (state === "child") {
    return { fill: "#3f3f46", stroke: "#27272a", strokeW: 0 };
  }
  if (type === "moc") {
    return { fill: "#18181b", stroke: "#000000", strokeW: 0 };
  }
  if (type === "concept") {
    return { fill: "#27272a", stroke: "#000000", strokeW: 0 };
  }
  if (type === "pattern") {
    return { fill: "#52525b", stroke: "#000000", strokeW: 0 };
  }
  return { fill: "#ffffff", stroke: "#d4d4d8", strokeW: 1.5 };
}

export function showExpandHint(state: ExpansionVisualState | undefined): boolean {
  return state === "initial" || state === "child";
}
