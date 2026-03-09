import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { taskQueue } from "@/lib/queue";
import { getRateLimitResponse } from "@/lib/api-middleware";
import { ingestFile, isSupportedMimeType, IngestError } from "@/lib/ingest";
import { z } from "zod";

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  goal: z.string().min(1),
  model: z.string().default("auto"),
  scheduleCron: z.string().optional(),
});

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { id: true, status: true, startedAt: true, finishedAt: true },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const rateLimited = getRateLimitResponse(req, 10, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let title: string;
    let goal: string;
    let model = "auto";
    let scheduleCron: string | undefined;
    let files: { buffer: Buffer; mimeType: string; filename: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = (formData.get("title") as string) ?? "";
      goal = (formData.get("goal") as string) ?? "";
      model = (formData.get("model") as string) ?? "auto";
      const cronVal = formData.get("scheduleCron") as string | null;
      scheduleCron = cronVal || undefined;

      const fileEntries = formData.getAll("files");
      for (const entry of fileEntries) {
        if (entry instanceof File && entry.size > 0) {
          const arrayBuf = await entry.arrayBuffer();
          files.push({
            buffer: Buffer.from(arrayBuf),
            mimeType: entry.type,
            filename: entry.name,
          });
        }
      }
    } else {
      const body = await req.json();
      const parsed = CreateTaskSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      title = parsed.data.title;
      goal = parsed.data.goal;
      model = parsed.data.model;
      scheduleCron = parsed.data.scheduleCron;
    }

    if (!title || !goal) {
      return NextResponse.json({ error: "title and goal are required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: { title, goal, model, scheduleCron, status: "queued" },
    });

    // Ingest attached files
    const ingestErrors: string[] = [];
    for (const file of files) {
      if (!isSupportedMimeType(file.mimeType)) {
        ingestErrors.push(`${file.filename}: unsupported type ${file.mimeType}`);
        continue;
      }
      try {
        const result = await ingestFile(file.buffer, file.mimeType, file.filename);
        await prisma.taskAttachment.create({
          data: {
            taskId: task.id,
            filename: file.filename,
            mimeType: file.mimeType,
            sizeBytes: file.buffer.byteLength,
            text: result.text,
          },
        });
      } catch (err) {
        const msg = err instanceof IngestError ? err.message : `Failed to parse ${file.filename}`;
        ingestErrors.push(msg);
      }
    }

    const run = await prisma.run.create({
      data: { taskId: task.id, status: "queued" },
    });

    await taskQueue.add("run-task", {
      runId: run.id,
      taskId: task.id,
      goal: task.goal,
      model,
    });

    if (scheduleCron) {
      await taskQueue.upsertJobScheduler(
        `task-${task.id}`,
        { pattern: scheduleCron },
        {
          name: "run-task",
          data: { taskId: task.id, goal: task.goal, model },
        }
      );
    }

    return NextResponse.json(
      { task, run, ...(ingestErrors.length > 0 ? { ingestWarnings: ingestErrors } : {}) },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
