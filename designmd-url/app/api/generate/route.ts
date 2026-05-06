import { Hyperbrowser } from "@hyperbrowser/sdk";
import { formatDesignMd, normalizeTargetUrl } from "@/lib/format-design-md";
import { NextResponse } from "next/server";

function asMetadataRecord(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  return meta ?? undefined;
}

export async function POST(req: Request) {
  let body: { url?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, apiKey } = body;

  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  if (!url || typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  const targetUrl = normalizeTargetUrl(url);

  /** Default SDK HTTP timeout is 30s; branding fetches often need longer. */
  const BRANDING_HTTP_TIMEOUT_MS = 180_000;

  try {
    const client = new Hyperbrowser({
      apiKey: apiKey.trim(),
      timeout: BRANDING_HTTP_TIMEOUT_MS,
    });

    const result = await client.web.fetch({
      url: targetUrl,
     
      stealth: "auto",
      outputs: {
        formats: ["branding"],
      },
      navigation: {
        waitUntil: "networkidle",
        timeoutMs: 60_000,
      },
    });

    if (result.status !== "completed") {
      return NextResponse.json(
        { error: result.error || `Fetch status: ${result.status}` },
        { status: 502 },
      );
    }

    const branding = result.data?.branding;
    if (!branding) {
      return NextResponse.json({ error: "Could not extract branding" }, { status: 500 });
    }

    const meta = asMetadataRecord(result.data?.metadata as Record<string, unknown> | undefined);
    const designMd = formatDesignMd(branding, targetUrl, meta);

    return NextResponse.json({
      designMd,
      branding,
      metadata: meta ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch branding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
