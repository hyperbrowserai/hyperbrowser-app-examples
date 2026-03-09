import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportRunAs, type ExportFormat } from "@/lib/export";

const VALID_FORMATS = new Set<ExportFormat>(["pdf", "docx", "xlsx", "pptx", "html", "md", "json", "csv", "txt"]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const url = new URL(req.url);
    const format = url.searchParams.get("format") as ExportFormat | null;

    if (!format || !VALID_FORMATS.has(format)) {
      return NextResponse.json(
        { error: `Invalid format. Supported: ${[...VALID_FORMATS].join(", ")}` },
        { status: 400 }
      );
    }

    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: {
        task: { select: { title: true, goal: true } },
        sources: { orderBy: { retrievedAt: "asc" } },
        subagents: { orderBy: { startedAt: "asc" } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const { buffer, mimeType, filename } = await exportRunAs(
      { ...run, startedAt: run.startedAt?.toISOString() ?? null, finishedAt: run.finishedAt?.toISOString() ?? null },
      format
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
