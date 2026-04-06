import { NextResponse } from "next/server";
import { z } from "zod";
import { decomposeGoal } from "@/lib/decompose";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  goal: z.string().min(4).max(4000),
  maxAgents: z.number().int().min(5).max(20).optional().default(10),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { goal, maxAgents } = bodySchema.parse(json);
    const subtasks = await decomposeGoal(goal, maxAgents);
    return NextResponse.json({ subtasks });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Decomposition failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
