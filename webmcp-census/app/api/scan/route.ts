import { DEFAULTS, normalizeUrl, scanSite } from "@/lib/census";

export const maxDuration = 90;

export async function POST(request: Request) {
  if (!process.env.HYPERBROWSER_API_KEY) {
    return Response.json(
      { error: "HYPERBROWSER_API_KEY is not set on the server. Add it to .env.local." },
      { status: 400 }
    );
  }

  let url: string;
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== "string" || !body.url.trim()) throw new Error("url is required");
    url = normalizeUrl(body.url);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }

  const result = await scanSite(url, {
    timeoutMs: DEFAULTS.timeoutMs,
    settleMs: DEFAULTS.settleMs,
  });
  return Response.json(result);
}
