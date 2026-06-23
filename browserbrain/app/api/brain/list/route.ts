// GET /api/brain/list -> every domain the brain knows, read from the persistent volume.
// Proves persistence: after a page reload this still returns everything.

import { brainMode, listMemories } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [domains, mode] = await Promise.all([listMemories(), brainMode()]);
    return Response.json({ domains, count: domains.length, mode });
  } catch (err) {
    return Response.json(
      { domains: [], count: 0, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
