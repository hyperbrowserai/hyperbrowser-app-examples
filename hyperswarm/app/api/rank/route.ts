import { NextResponse } from "next/server";
import { z } from "zod";
import { rankSnippets } from "@/lib/rank";

export const runtime = "nodejs";
export const maxDuration = 60;

const snippetSchema = z.object({
  subtaskIndex: z.number().int().nonnegative(),
  siteName: z.string(),
  text: z.string(),
});

const bodySchema = z.object({
  snippets: z.array(snippetSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { snippets } = bodySchema.parse(json);
    const { ranked, duplicatesRemoved } = await rankSnippets(snippets);
    return NextResponse.json({ ranked, duplicatesRemoved });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Rank failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
