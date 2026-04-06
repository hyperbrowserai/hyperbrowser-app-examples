import { getOpenAI, ORCHESTRATOR_MODEL } from "@/lib/openai";
import type { AgentResult, RankedResult, SwarmSynthesis } from "@/lib/types";

const SYSTEM = `You are a synthesis engine. Given a user's original goal and results from multiple
parallel browser agents that searched different websites, produce:

1. headline: one short line for a dashboard (e.g. "Swarm complete — 8 agents")
2. recommendation: 2-4 sentences with the main takeaway and runner-up if relevant
3. rankedResults: refine the provided ranked list if needed (same schema), keep best items first, max 25 items

Return JSON:
{
  "headline": string,
  "recommendation": string,
  "rankedResults": [ { "rank", "title", "keyData", "sources", "summary" } ]
}

Be specific with numbers, prices, and sources when present. Note when multiple agents agree.`;

export async function synthesizeSwarm(
  goal: string,
  agentResults: AgentResult[],
  seedRanked: RankedResult[],
  stats: Omit<SwarmSynthesis, "headline" | "recommendation">,
): Promise<{ synthesis: SwarmSynthesis; rankedResults: RankedResult[] }> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: ORCHESTRATOR_MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          goal,
          stats,
          agentResults,
          seedRanked,
        }),
      },
    ],
    response_format: { type: "json_object" },
  });
  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("Empty synthesis response");
  }
  const parsed = JSON.parse(text) as {
    headline?: string;
    recommendation?: string;
    rankedResults?: RankedResult[];
  };
  const rankedResults = Array.isArray(parsed.rankedResults)
    ? parsed.rankedResults.map((r, i) => ({
        rank: typeof r.rank === "number" ? r.rank : i + 1,
        title: String(r.title ?? ""),
        keyData: String(r.keyData ?? ""),
        sources: Array.isArray(r.sources) ? r.sources.map(String) : [],
        summary: String(r.summary ?? ""),
      }))
    : seedRanked;

  const synthesis: SwarmSynthesis = {
    headline: String(parsed.headline ?? "Swarm complete"),
    recommendation: String(parsed.recommendation ?? ""),
    ...stats,
  };

  return { synthesis, rankedResults };
}
