import Anthropic from "@anthropic-ai/sdk";
import type { GraphNode, SkillGraph, GeneratedFile } from "@/types/graph";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a domain knowledge graph architect. Given a topic and source material, produce a deeply interconnected JSON skill graph that enables an agent to UNDERSTAND the domain — not merely summarize it. This is the difference between an agent that follows instructions and an agent that understands a domain.

Output format (JSON only):
{
  "topic": "the topic",
  "nodes": [
    {
      "id": "kebab-case-id",
      "label": "Human Readable Label",
      "type": "moc" | "concept" | "pattern" | "gotcha",
      "description": "One-sentence description the agent can scan to decide whether to read the full file",
      "content": "Full markdown content with [[wikilinks]] woven into prose",
      "links": ["other-node-id"]
    }
  ]
}

Node type definitions:
- "moc" — exactly 1 per graph; the Map of Content and traversal entry point
- "concept" — a foundational idea, theory, or framework in the domain
- "pattern" — a reusable approach, technique, or methodology
- "gotcha" — a counterintuitive finding, failure mode, or common mistake

Rules:
- Generate 12–18 nodes total
- Exactly 1 node must be type "moc"
- Every [[wikilink]] must appear INSIDE a prose sentence that explains WHY the agent should follow it. Never list wikilinks as bare bullets — they must carry meaning through the sentence they live in.
- The "links" array must list every node ID referenced via [[wikilinks]] in the content
- Every non-moc node must begin with YAML frontmatter:
  ---
  title: Human Readable Label
  type: concept | pattern | gotcha
  description: One-sentence scan description
  ---
- Node IDs must be kebab-case
- Content must be rich, substantive markdown — not summaries. Each node is one complete thought or claim about the domain.

MOC node requirements (type "moc"):
- Opens with a 2-3 sentence overview of the domain and why structured knowledge of it matters
- Contains a "## Domain Clusters" section where each cluster is described in 1-2 sentences with [[wikilinks]] to relevant concept nodes woven into the prose
- Contains an "## Explorations Needed" section with 2-3 open questions the graph does not yet answer — gaps in the current knowledge structure
- The MOC is a navigable entry point, not a table of contents. Each link must be justified in prose.

Depth requirements:
- Concept nodes must explain the underlying mechanism or theory, not just define terms
- Pattern nodes must include when to apply the pattern and what breaks it
- Gotcha nodes must explain why the mistake is made and what the correct mental model is
- This graph should give an agent enough structured knowledge to reason about novel situations in the domain`;


export async function generateGraph(
  topic: string,
  docs: { url: string; markdown: string }[]
): Promise<{ graph: SkillGraph; files: GeneratedFile[] }> {
  const truncatedDocs = docs
    .map((d) => `## Source: ${d.url}\n\n${d.markdown.slice(0, 4000)}`)
    .join("\n\n---\n\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Topic: ${topic}\n\nScraped documentation:\n\n${truncatedDocs}\n\nRespond with ONLY the JSON object, no other text.`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : null;
  if (!raw) throw new Error("Empty response from Claude");

  const parsed = JSON.parse(raw) as SkillGraph;

  if (!parsed.nodes || parsed.nodes.length < 3) {
    throw new Error("Generated graph has too few nodes");
  }

  const files: GeneratedFile[] = parsed.nodes.map((node: GraphNode) => ({
    path: `${slugify(topic)}/${node.id}.md`,
    content: node.content,
  }));

  return { graph: parsed, files };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
