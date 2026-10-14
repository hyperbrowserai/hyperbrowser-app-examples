import { loadRun } from "@/lib/data";
import { sitesCsv, toolsCsv } from "@/lib/summary";

const FILES = {
  "results.json": "application/json",
  "sites.csv": "text/csv",
  "tools.csv": "text/csv",
} as const;

export async function GET(_request: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!(file in FILES)) return Response.json({ error: "Unknown file" }, { status: 404 });

  const loaded = await loadRun();
  if (!loaded) return Response.json({ error: "No results yet" }, { status: 404 });

  const body =
    file === "results.json"
      ? JSON.stringify(loaded.run, null, 2)
      : file === "sites.csv"
        ? sitesCsv(loaded.run)
        : toolsCsv(loaded.run);

  return new Response(body, {
    headers: {
      "content-type": `${FILES[file as keyof typeof FILES]}; charset=utf-8`,
      "content-disposition": `attachment; filename="webmcp-census-${file}"`,
    },
  });
}
