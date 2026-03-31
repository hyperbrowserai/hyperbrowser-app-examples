import { NextRequest, NextResponse } from "next/server";
import { searchExpansionDocs } from "@/lib/serper";
import { scrapeUrls, ConcurrencyPlanError } from "@/lib/hyperbrowser";
import { generateExpansion } from "@/lib/expand-generator";
import type {
  ExpandNodeResponse,
  GeneratedFile,
  GraphEdgePair,
  GraphNode,
} from "@/types/graph";

export const maxDuration = 30;

const MAX_TOTAL_NODES = 60;
const MAX_DEPTH = 5;
const MAX_SCRAPE = 3;

function childStoragePath(parentFilePath: string, childId: string): string {
  const base = parentFilePath.replace(/\.md$/i, "");
  return `${base}/${childId}.md`;
}

function buildNewConnections(
  parentId: string,
  newNodes: GraphNode[],
  allIds: Set<string>
): GraphEdgePair[] {
  const pairs: GraphEdgePair[] = [];
  const seen = new Set<string>();

  function add(s: string, t: string) {
    const a = s < t ? s : t;
    const b = s < t ? t : s;
    const key = `${a}::${b}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ source: s, target: t });
  }

  for (const n of newNodes) {
    add(parentId, n.id);
    for (const t of n.links) {
      const tid = t.toLowerCase();
      if (allIds.has(tid) && t !== n.id) add(n.id, t);
    }
  }

  for (let i = 0; i < newNodes.length; i++) {
    for (let j = i + 1; j < newNodes.length; j++) {
      const a = newNodes[i];
      const b = newNodes[j];
      if (a.links.includes(b.id)) add(a.id, b.id);
      if (b.links.includes(a.id)) add(a.id, b.id);
    }
  }

  return pairs;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const nodeId = typeof body.nodeId === "string" ? body.nodeId.trim() : "";
    const nodeContent =
      typeof body.nodeContent === "string" ? body.nodeContent : "";
    const existingNodeIds: string[] = Array.isArray(body.existingNodeIds)
      ? body.existingNodeIds.filter((x: unknown) => typeof x === "string")
      : [];
    const parentContext =
      typeof body.parentContext === "string" ? body.parentContext : "";
    const parentFilePath =
      typeof body.parentFilePath === "string" ? body.parentFilePath : "";
    const parentDepth =
      typeof body.parentDepth === "number" && Number.isFinite(body.parentDepth)
        ? body.parentDepth
        : 0;

    if (!topic || !nodeId || !nodeContent || !parentFilePath) {
      return NextResponse.json(
        { error: "topic, nodeId, nodeContent, and parentFilePath are required" },
        { status: 400 }
      );
    }

    if (existingNodeIds.length >= MAX_TOTAL_NODES) {
      return NextResponse.json(
        { error: `Graph cannot exceed ${MAX_TOTAL_NODES} nodes` },
        { status: 400 }
      );
    }

    if (parentDepth >= MAX_DEPTH) {
      return NextResponse.json(
        { error: `Maximum expansion depth is ${MAX_DEPTH}` },
        { status: 400 }
      );
    }

    if (!existingNodeIds.includes(nodeId)) {
      return NextResponse.json({ error: "Unknown node" }, { status: 400 });
    }

    const urls = await searchExpansionDocs(topic, nodeId);
    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No documentation found for this expansion" },
        { status: 404 }
      );
    }

    const toScrape = urls.slice(0, MAX_SCRAPE);
    const scraped = await scrapeUrls(toScrape);
    const docs = scraped
      .filter((d) => d.markdown.length <= 80000 && d.markdown.length >= 100)
      .slice(0, MAX_SCRAPE);

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "Failed to scrape usable documentation for expansion" },
        { status: 502 }
      );
    }

    const nodeLabel =
      typeof body.nodeLabel === "string" && body.nodeLabel.trim()
        ? body.nodeLabel.trim()
        : nodeId;

    const { newNodes, parentUpdatedContent } = await generateExpansion({
      topic,
      nodeId,
      nodeLabel,
      nodeContent,
      existingNodeIds,
      parentContext,
      scrapedDocs: docs,
    });

    const room = MAX_TOTAL_NODES - existingNodeIds.length;
    const capped = newNodes.slice(0, Math.min(newNodes.length, room));
    if (capped.length === 0) {
      return NextResponse.json(
        { error: "Expansion would exceed node limit" },
        { status: 400 }
      );
    }

    const newFiles: GeneratedFile[] = capped.map((n) => ({
      path: childStoragePath(parentFilePath, n.id),
      content: n.content,
    }));

    const allIds = new Set(existingNodeIds.map((id) => id.toLowerCase()));
    for (const n of capped) allIds.add(n.id.toLowerCase());

    const newConnections = buildNewConnections(nodeId, capped, allIds);

    const payload: ExpandNodeResponse = {
      newNodes: capped,
      newFiles,
      parentUpdatedContent,
      newConnections,
    };

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof ConcurrencyPlanError) {
      return NextResponse.json(
        {
          error: err.message,
          upgradeUrl: "https://hyperbrowser.ai",
        },
        { status: 402 }
      );
    }
    console.error("[expand-node]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
