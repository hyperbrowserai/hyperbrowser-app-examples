import { getOpenAI, UTILITY_MODEL } from "@/lib/openai";
import type { RankedResult, RawAgentSnippet } from "@/lib/types";

const SYSTEM = `You are a fast ranking and deduplication engine.
Given raw text snippets from multiple web agents (different sites), extract distinct findings
(products, options, facts, listings, etc.), remove duplicates and near-duplicates, and score each 0-100
by relevance, data quality, and source reliability.

Return JSON:
{
  "ranked": [
    {
      "rank": 1,
      "title": "short name",
      "keyData": "price, rating, or key facts on one line",
      "sources": ["Site A", "Site B"],
      "summary": "one line",
      "score": 92
    }
  ],
  "duplicatesRemoved": 0
}

Sort ranked by score descending, then re-assign rank 1..n. If no extractable findings, return ranked: [].`;

export async function rankSnippets(snippets: RawAgentSnippet[]): Promise<{
  ranked: RankedResult[];
  duplicatesRemoved: number;
}> {
  if (snippets.length === 0) {
    return { ranked: [], duplicatesRemoved: 0 };
  }
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: UTILITY_MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: JSON.stringify(
          snippets.map((s) => ({
            site: s.siteName,
            index: s.subtaskIndex,
            text: s.text.slice(0, 12000),
          })),
        ),
      },
    ],
    response_format: { type: "json_object" },
  });
  const text = response.choices[0]?.message?.content;
  if (!text) return { ranked: [], duplicatesRemoved: 0 };
  const parsed = JSON.parse(text) as {
    ranked?: Array<{
      rank?: number;
      title?: string;
      keyData?: string;
      sources?: string[];
      summary?: string;
    }>;
    duplicatesRemoved?: number;
  };
  const ranked = (parsed.ranked ?? []).map((r, i) => ({
    rank: typeof r.rank === "number" ? r.rank : i + 1,
    title: String(r.title ?? "Finding"),
    keyData: String(r.keyData ?? ""),
    sources: Array.isArray(r.sources) ? r.sources.map(String) : [],
    summary: String(r.summary ?? ""),
  }));
  return {
    ranked,
    duplicatesRemoved: Number(parsed.duplicatesRemoved ?? 0),
  };
}
