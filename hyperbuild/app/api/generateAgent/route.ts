import { NextRequest, NextResponse } from "next/server";
import { generateAgentFromIdea } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const { idea } = (await req.json()) as { idea?: string };
  if (!idea) return NextResponse.json({ error: "idea required" }, { status: 400 });
  const graph = await generateAgentFromIdea(idea);
  // Post-process: enforce Start/End and at least one Hyperbrowser node
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const hasStart = nodes.some((n) => n.type === "Start");
  const hasEnd = nodes.some((n) => n.type === "End" || n.type === "Output");
  const hasHB = nodes.some((n) => ["Scrape", "Extract", "Crawl"].includes(n.type));
  const ensured = { nodes: [...nodes], edges: [...edges] } as typeof graph;
  if (!hasStart) ensured.nodes.unshift({ id: "s1", type: "Start", data: { input: "" } });
  if (!hasEnd) ensured.nodes.push({ id: "e1", type: "End", data: { filename: "output.json" } });
  if (!hasHB) ensured.nodes.splice(1, 0, { id: "n_hb1", type: "Scrape", data: { url: "" } });
  // Validate edges and rebuild linear path when invalid or insufficient
  const idSet = new Set(ensured.nodes.map((n) => n.id));
  const validEdges = ensured.edges.filter((e) => e && idSet.has(e.source) && idSet.has(e.target));
  const needRewire = validEdges.length < ensured.nodes.length - 1;
  // Order nodes for a sensible flow: Start -> HB -> Transform -> LLM -> QnA -> Output/End
  const priority: Record<string, number> = { Start: 0, Scrape: 1, Extract: 1, Crawl: 1, Transform: 2, LLM: 3, QnAGenerator: 4, Output: 9, End: 9 };
  const ordered = [...ensured.nodes].sort((a, b) => (priority[a.type] ?? 5) - (priority[b.type] ?? 5));
  // Ensure Start first and End last explicitly
  const start = ordered.find((n) => n.type === "Start");
  const end = ordered.find((n) => n.type === "End" || n.type === "Output");
  const middle = ordered.filter((n) => n !== start && n !== end);
  const finalOrder = [start!, ...middle, end!].filter(Boolean);
  if (needRewire) {
    ensured.edges = [];
    for (let i = 0; i < finalOrder.length - 1; i++) {
      ensured.edges.push({ id: `e${i + 1}`, source: finalOrder[i].id, target: finalOrder[i + 1].id });
    }
  } else {
    ensured.edges = validEdges;
  }
  // Seed sensible defaults
  for (const n of ensured.nodes) {
    if (n.type === "LLM") {
      n.data = { ...(n.data || {}), instruction: n.data?.instruction || "Analyze scraped text and summarize key insights as bullet points." };
    }
  }
  return NextResponse.json(ensured);
}


