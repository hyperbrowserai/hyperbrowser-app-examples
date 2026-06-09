import { NextRequest, NextResponse } from "next/server";
import { getHyperbrowser } from "@/lib/hyperbrowser";
import { runHarnessInBackground, TEST_TASKS } from "@/lib/agent-runner";
import { generateScanId, scans } from "@/lib/store";
import type { Scan } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

function normalizeRepoUrl(input: string): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (!/(^|\.)github\.com$/i.test(u.hostname)) {
      return null;
    }
    // Strip trailing slash; keep .git or bare form as-is.
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { repoUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoUrl = normalizeRepoUrl(body.repoUrl ?? "");
  if (!repoUrl) {
    return NextResponse.json(
      { error: "Enter a valid public GitHub repository URL." },
      { status: 400 }
    );
  }

  let sandbox;
  try {
    sandbox = await getHyperbrowser().sandboxes.create({
      imageName: "node",
      cpu: 4,
      memoryMiB: 4096,
      diskMiB: 16384,
      timeoutMinutes: 15,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create sandbox" },
      { status: 500 }
    );
  }

  const scanId = generateScanId();
  const scan: Scan = {
    repoUrl,
    sandboxId: sandbox.id,
    status: "cloning",
    currentTask: 0,
    totalTasks: TEST_TASKS.length,
    failures: [],
    results: null,
    terminal: [],
  };
  scans.set(scanId, scan);

  // Fire-and-forget: runs for minutes under the long-lived node server.
  void runHarnessInBackground(scanId, sandbox, repoUrl);

  return NextResponse.json({ scanId });
}
