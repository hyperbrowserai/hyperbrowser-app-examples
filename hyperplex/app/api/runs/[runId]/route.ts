import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: {
        steps: { orderBy: { startedAt: "asc" } },
        sources: { orderBy: { retrievedAt: "asc" } },
        subagents: { orderBy: { startedAt: "asc" } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
