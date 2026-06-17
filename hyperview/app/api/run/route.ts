import { NextResponse } from "next/server";
import { createRun, emit } from "@/lib/store";
import { startAgentRun } from "@/lib/agent";
import { SANDBOX_IMAGE } from "@/lib/hyperbrowser";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  let task = "";
  try {
    const body = await req.json();
    task = typeof body?.task === "string" ? body.task.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!task) {
    return NextResponse.json({ error: "A task is required" }, { status: 400 });
  }

  const runId =
    "run_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  createRun(runId, task, SANDBOX_IMAGE);
  emit(runId, { type: "status", status: "booting", image: SANDBOX_IMAGE });

  // Fire-and-forget: start the agent loop in the background, return immediately.
  startAgentRun(runId, task).catch((err) => {
    emit(runId, {
      type: "error",
      message: err instanceof Error ? err.message : "Run failed to start",
    });
  });

  return NextResponse.json({ runId });
}
