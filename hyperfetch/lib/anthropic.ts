import Anthropic from "@anthropic-ai/sdk";
import type { EnrichedResult } from "./types";

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function enrich(
  url: string,
  markdown: string,
  metadata: Record<string, unknown> | undefined,
): Promise<EnrichedResult> {
  const client = getClient();

  const title = (metadata?.title as string | undefined) ?? "Unknown";
  const description = (metadata?.description as string | undefined) ?? "Unknown";

  const truncated = markdown.length > 80_000 ? markdown.slice(0, 80_000) : markdown;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a web content enrichment engine. Given raw markdown content from a webpage, extract and structure ALL information into a clean, citable dataset.

Source URL: ${url}
Page Title: ${title}
Page Description: ${description}

Raw content:
${truncated}

Return ONLY a JSON object (no markdown backticks, no preamble):
{
  "title": "page title",
  "description": "one sentence summary",
  "summary": "2-3 sentence TL;DR of the entire page",
  "keyFacts": [
    { "fact": "a specific, verifiable claim from the page", "category": "pricing|feature|statistic|announcement|definition|comparison" }
  ],
  "tables": [
    { "title": "table description", "headers": ["col1", "col2"], "rows": [["val1", "val2"]] }
  ],
  "codeBlocks": [
    { "language": "javascript|python|bash|etc", "code": "the code snippet", "description": "what this code does" }
  ],
  "stats": [
    { "label": "metric name", "value": "the number/percentage", "context": "brief context" }
  ],
  "entities": {
    "companies": ["company names mentioned"],
    "people": ["people mentioned"],
    "products": ["products/tools mentioned"],
    "technologies": ["tech/frameworks mentioned"]
  },
  "links": {
    "docs": ["documentation links"],
    "social": ["social media links"],
    "pricing": ["pricing links"],
    "other": ["other important links"]
  },
  "lastUpdated": "any date/timestamp found on the page or null",
  "author": "author name if found or null",
  "contentType": "documentation|blog|landing|pricing|api-reference|news|other"
}

Rules:
- Extract EVERY verifiable fact, not just the first few
- Tables should preserve the original structure exactly
- Code blocks should preserve exact formatting
- Stats should include specific numbers, percentages, dates
- Entities should catch every company, person, product, and technology mentioned
- If a field has no data, use an empty array or null
- Every fact must be something actually stated on the page, not inferred`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  const cleaned = stripCodeFence(textBlock.text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Claude returned non-JSON output");
  }

  const p = parsed as Partial<EnrichedResult>;
  return {
    title: p.title ?? title,
    description: p.description ?? "",
    summary: p.summary ?? "",
    keyFacts: p.keyFacts ?? [],
    tables: p.tables ?? [],
    codeBlocks: p.codeBlocks ?? [],
    stats: p.stats ?? [],
    entities: p.entities ?? { companies: [], people: [], products: [], technologies: [] },
    links: p.links ?? { docs: [], social: [], pricing: [], other: [] },
    lastUpdated: p.lastUpdated ?? null,
    author: p.author ?? null,
    contentType: p.contentType ?? "other",
    sourceUrl: url,
  };
}
