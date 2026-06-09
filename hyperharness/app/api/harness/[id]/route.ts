import { NextResponse } from "next/server";
import { scans } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scan = scans.get(id);
  if (!scan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(scan);
}
