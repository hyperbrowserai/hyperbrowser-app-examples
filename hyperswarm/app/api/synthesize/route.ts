import { NextResponse } from "next/server";
import { z } from "zod";
import { synthesizeSwarm } from "@/lib/synthesize";
import type { AgentResult, RankedResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const agentResultSchema = z.object({
  subtaskIndex: z.number(),
  siteName: z.string(),
  result: z.string().nullable(),
  status: z.enum(["completed", "failed", "stopped"]),
  error: z.string().optional(),
});

const rankedSchema = z.object({
  rank: z.number(),
  title: z.string(),
  keyData: z.string(),
  sources: z.array(z.string()),
  summary: z.string(),
});

const bodySchema = z.object({
  goal: z.string(),
  results: z.array(agentResultSchema),
  seedRanked: z.array(rankedSchema),
  stats: z.object({
    agentsCount: z.number(),
    sitesVisited: z.number(),
    resultsCount: z.number(),
    durationMs: z.number(),
  }),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { goal, results, seedRanked, stats } = bodySchema.parse(json);
    const { synthesis, rankedResults } = await synthesizeSwarm(
      goal,
      results as AgentResult[],
      seedRanked as RankedResult[],
      stats,
    );
    return NextResponse.json({ synthesis, rankedResults });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Synthesis failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
