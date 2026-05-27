import { NextRequest, NextResponse } from "next/server";
import { getHyperbrowser } from "@/lib/hyperbrowser";
import { runAgentsInBackground } from "@/lib/runner";
import { generateScanId, scans } from "@/lib/store";
import type { AgentName, Scan } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { url?: string; task?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = normalizeUrl(body.url ?? "");
  const task = (body.task ?? "").trim();
  if (!url) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  if (!task) return NextResponse.json({ error: "Task is required" }, { status: 400 });

  const client = getHyperbrowser();

  let sessions;
  try {
    sessions = await Promise.all([
      client.sessions.create(),
      client.sessions.create(),
      client.sessions.create(),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create sessions" },
      { status: 500 }
    );
  }

  const [claudeS, openaiS, geminiS] = sessions;
  const sessionIds: Record<AgentName, string> = {
    claude: claudeS.id,
    openai: openaiS.id,
    gemini: geminiS.id,
  };

  const scanId = generateScanId();
  const scan: Scan = {
    id: scanId,
    url,
    task,
    sessions: {
      claude: { id: claudeS.id, liveViewUrl: claudeS.liveUrl ?? null },
      openai: { id: openaiS.id, liveViewUrl: openaiS.liveUrl ?? null },
      gemini: { id: geminiS.id, liveViewUrl: geminiS.liveUrl ?? null },
    },
    results: {},
    status: "running",
    createdAt: Date.now(),
  };
  scans.set(scanId, scan);

  runAgentsInBackground(scanId, url, task, sessionIds);

  return NextResponse.json({
    scanId,
    sessions: scan.sessions,
  });
}
