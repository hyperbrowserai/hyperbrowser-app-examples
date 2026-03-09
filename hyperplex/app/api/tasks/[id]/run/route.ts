import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { taskQueue } from "@/lib/queue";
import { getRateLimitResponse } from "@/lib/api-middleware";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = getRateLimitResponse(req, 5, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    let goalOverride: string | null = null;
    try {
      const body = await req.json();
      if (body.goal && typeof body.goal === "string" && body.goal.trim()) {
        goalOverride = body.goal.trim();
      }
    } catch {
      // no body or invalid JSON — use task's original goal
    }

    const runGoal = goalOverride ?? task.goal;

    const run = await prisma.run.create({
      data: {
        taskId: task.id,
        goal: runGoal,
        status: "queued",
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { status: "queued" },
    });

    await taskQueue.add("run-task", {
      runId: run.id,
      taskId: task.id,
      goal: runGoal,
      model: task.model,
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
