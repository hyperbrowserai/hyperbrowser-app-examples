import OpenAI from "openai";
import type { GraphNode, NodeType } from "@/types/graph";

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI();
  return openaiClient;
}

const EXPAND_SYSTEM = `You expand one node in a skill graph. Output JSON only with this shape:
{
  "newNodes": [
    {
      "id": "kebab-case-id",
      "label": "Human Readable Label",
      "type": "concept" | "pattern" | "gotcha",
      "description": "One-sentence scan description",
      "content": "Full markdown with YAML frontmatter then body with [[wikilinks]]",
      "links": ["other-node-id"]
    }
  ],
  "parentUpdatedContent": "Full updated markdown for the parent node (include YAML if present in input)"
}

Rules:
- Generate 3–6 items in newNodes only. Never duplicate existing node IDs.
- Non-moc nodes must start with YAML frontmatter: title, type (concept|pattern|gotcha), description, links (array matching wikilinks to node ids).
- MOC type is NOT allowed in newNodes.
- Every [[wikilink]] must appear inside prose that explains why to follow it.
- "links" must list every node id referenced via [[wikilinks]] in that node's content.
- Each new node must link back to the parent using [[parent-id]] where parent-id is the exact parent node id provided.
- Link new siblings to each other where relevant.
- Link to other existing graph nodes only when genuinely supported by the scraped text.
- Use ONLY information from the scraped documentation. Do not invent APIs or URLs.
- Keep each new node body substantive but roughly 50–100 lines of markdown (shorter than a top-level domain node).
- parentUpdatedContent must weave in [[wikilinks]] to every new child id and preserve the parent's role; update the frontmatter links array to include new children.`;

export interface ExpandGeneratorInput {
  topic: string;
  nodeId: string;
  nodeLabel: string;
  nodeContent: string;
  existingNodeIds: string[];
  parentContext: string;
  scrapedDocs: { url: string; markdown: string }[];
}

export interface ExpandGeneratorResult {
  newNodes: GraphNode[];
  parentUpdatedContent: string;
}

function normalizeType(t: string): NodeType {
  if (t === "pattern" || t === "gotcha") return t;
  return "concept";
}

export async function generateExpansion(
  input: ExpandGeneratorInput
): Promise<ExpandGeneratorResult> {
  const { topic, nodeId, nodeLabel, nodeContent, existingNodeIds, parentContext, scrapedDocs } =
    input;

  const docBlock = scrapedDocs
    .map((d) => {
      const body =
        d.markdown.length > 80000
          ? d.markdown.slice(0, 80000) + "\n\n[truncated]"
          : d.markdown;
      return `## Source: ${d.url}\n\n${body.slice(0, 12000)}`;
    })
    .join("\n\n---\n\n");

  const user = `You are expanding a node in a skill graph. The user wants to go deeper on "${nodeLabel}" (id: ${nodeId}) which is part of a larger knowledge graph about "${topic}".

Current node content:
${nodeContent}

Existing nodes in the graph (DO NOT duplicate these ids):
${existingNodeIds.join(", ")}

Brief parent graph context:
${parentContext}

Scraped documentation (only source of truth):
${docBlock}

Generate 3–6 NEW sub-concept nodes as JSON (newNodes + parentUpdatedContent). Parent node id for backlinks is exactly: ${nodeId}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXPAND_SYSTEM },
      { role: "user", content: user },
    ],
    temperature: 0.5,
    max_tokens: 8192,
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(raw) as {
    newNodes?: GraphNode[];
    parentUpdatedContent?: string;
  };

  if (!parsed.newNodes?.length || !parsed.parentUpdatedContent) {
    throw new Error("Expansion response missing newNodes or parentUpdatedContent");
  }

  const existing = new Set(existingNodeIds.map((id) => id.toLowerCase()));
  const cleaned: GraphNode[] = [];

  for (const n of parsed.newNodes) {
    if (!n?.id || existing.has(n.id.toLowerCase())) continue;
    if (n.type === "moc") continue;
    cleaned.push({
      id: n.id,
      label: n.label ?? n.id,
      type: normalizeType(n.type),
      description: n.description ?? "",
      content: n.content ?? "",
      links: Array.isArray(n.links) ? n.links : [],
    });
    existing.add(n.id.toLowerCase());
  }

  if (cleaned.length < 1) {
    throw new Error("Expansion produced no valid new nodes");
  }

  return {
    newNodes: cleaned,
    parentUpdatedContent: parsed.parentUpdatedContent,
  };
}
