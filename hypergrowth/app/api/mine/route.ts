import { NextResponse } from "next/server";
import { buildDemoResult } from "@/lib/demo-data";
import { getHyperbrowserClient } from "@/lib/hyperbrowser";
import { mineRequestSchema } from "@/lib/schema";
import { mineSource } from "@/lib/sources";
import { synthesizeSignals } from "@/lib/synthesis";
import type { MineResult, PainSignal } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = mineRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const { query, sources, maxResults } = parsed.data;

  if (!process.env.HYPERBROWSER_API_KEY) {
    return NextResponse.json(buildDemoResult(query));
  }

  const client = getHyperbrowserClient();
  const errors: string[] = [];
  const perSourceLimit = Math.max(2, Math.ceil(maxResults / sources.length));

  const settled = await Promise.allSettled(
    sources.map((source) => mineSource(client, source, query, perSourceLimit))
  );

  const signals: PainSignal[] = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      signals.push(...result.value);
      return;
    }

    errors.push(`${sources[index]}: ${result.reason}`);
  });

  if (signals.length === 0) {
    const demo = buildDemoResult(query);
    return NextResponse.json({
      ...demo,
      metadata: {
        ...demo.metadata,
        searchedSources: sources,
        errors,
        notes: [
          "No live signals were extracted, so demo data is shown to preserve the workflow.",
        ],
      },
    });
  }

  const synthesis = await synthesizeSignals(query, signals.slice(0, maxResults));
  const result: MineResult = {
    query,
    generatedAt: new Date().toISOString(),
    mode: "live",
    signals: signals.slice(0, maxResults),
    ...synthesis,
    metadata: {
      searchedSources: sources,
      errors,
      notes: process.env.OPENAI_API_KEY
        ? []
        : ["OPENAI_API_KEY is not set, so heuristic synthesis was used."],
    },
  };

  return NextResponse.json(result);
}
