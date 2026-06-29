import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import type { Site } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULTS_PATH = join(process.cwd(), "lib", "results.json");

export async function GET() {
  try {
    const [stats, raw] = await Promise.all([
      stat(RESULTS_PATH),
      readFile(RESULTS_PATH, "utf8"),
    ]);
    const sites = JSON.parse(raw) as Site[];
    return Response.json({
      sites: Array.isArray(sites) ? sites : [],
      updatedAt: stats.mtime.toISOString(),
    });
  } catch {
    return Response.json({ sites: [], updatedAt: null });
  }
}
