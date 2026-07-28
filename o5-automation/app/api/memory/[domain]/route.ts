import { loadMemory } from "@/lib/memory";

export const runtime = "nodejs";

function validDomain(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 253 &&
    /^[a-z0-9.-]+$/i.test(value) &&
    !value.includes("..")
  );
}

/** Return one portable domain memory document as JSON. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ domain: string }> }
): Promise<Response> {
  const { domain: encoded } = await context.params;
  const domain = decodeURIComponent(encoded).toLowerCase().replace(/^www\./, "");
  if (!validDomain(domain)) {
    return Response.json({ error: "Invalid domain." }, { status: 400 });
  }

  const memory = await loadMemory(domain);
  if (!memory) {
    return Response.json({ error: "No memory for this domain." }, { status: 404 });
  }

  return Response.json(memory, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${domain}.json"`,
    },
  });
}
