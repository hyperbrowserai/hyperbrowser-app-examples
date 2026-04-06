import { NextResponse } from "next/server";
import { z } from "zod";
import { getHyperbrowser } from "@/lib/hyperbrowser";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  jobIds: z.array(z.string().min(1)),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { jobIds } = bodySchema.parse(json);
    const client = getHyperbrowser();
    await Promise.allSettled(jobIds.map((id) => client.agents.browserUse.stop(id)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stop failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
