import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
          include: {
            steps: { orderBy: { startedAt: "asc" } },
            sources: { orderBy: { retrievedAt: "asc" } },
            subagents: { orderBy: { startedAt: "asc" } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { runs: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      for (const run of task.runs) {
        await tx.source.deleteMany({ where: { runId: run.id } });
        await tx.subagent.deleteMany({ where: { runId: run.id } });
        await tx.step.deleteMany({ where: { runId: run.id } });
      }
      await tx.run.deleteMany({ where: { taskId: id } });
      await tx.task.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
