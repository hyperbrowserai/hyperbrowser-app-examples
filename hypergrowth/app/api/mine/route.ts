import { NextResponse } from "next/server";
import { executeMineRun } from "@/lib/mine-runner";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const run = await executeMineRun(body);

  if (!run.ok) {
    return NextResponse.json({ error: run.error }, { status: run.status });
  }

  return NextResponse.json(run.result);
}
