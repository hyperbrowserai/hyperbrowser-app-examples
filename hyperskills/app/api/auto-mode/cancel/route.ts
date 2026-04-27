import { NextRequest, NextResponse } from "next/server";
import { requestAutoModeCancel } from "@/lib/auto-mode-cancel";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId } = body as { runId?: string };

    if (!runId || typeof runId !== "string") {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    requestAutoModeCancel(runId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
