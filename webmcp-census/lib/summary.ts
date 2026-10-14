import type { CensusRun, SiteResult, SiteSummary } from "./types";

export function summarizeSite(site: SiteResult): SiteSummary {
  const tools = site.tools;
  return {
    url: site.url,
    host: site.host,
    status: site.status,
    error: site.error,
    httpStatus: site.httpStatus,
    toolCount: tools.length,
    readOnlyHints: tools.filter((t) => t.annotations.readOnly).length,
    consequentialHints: tools.filter((t) => t.annotations.consequential).length,
    destructiveHints: tools.filter((t) => t.annotations.destructive).length,
    declarative: tools.filter((t) => t.declarative).length,
    imperative: tools.filter((t) => !t.declarative).length,
    frames: new Set(tools.map((t) => `${t.tabId}|${t.frameUrl}`)).size,
    tabs: new Set(tools.map((t) => t.tabId)).size,
    providers: [...new Set(tools.map((t) => t.provider))].sort(),
    durationMs: site.durationMs,
  };
}

export type Headline = {
  checked: number;
  reachable: number;
  withTools: number;
  totalTools: number;
  failed: number;
};

export function headline(run: CensusRun): Headline {
  const sites = run.sites;
  return {
    checked: sites.length,
    reachable: sites.filter((s) => s.status === "ok").length,
    withTools: sites.filter((s) => s.tools.length > 0).length,
    totalTools: sites.reduce((n, s) => n + s.tools.length, 0),
    failed: sites.filter((s) => s.status !== "ok").length,
  };
}

export function headlineSentence(h: Headline): string {
  if (h.checked === 0) return "No sites checked yet.";
  const base = `We checked ${h.checked} site${h.checked === 1 ? "" : "s"}`;
  if (h.withTools === 0) {
    return `${base}. None of them declared any WebMCP tools.`;
  }
  return `${base}. ${h.withTools} declared WebMCP tools (${h.totalTools} tool${
    h.totalTools === 1 ? "" : "s"
  } in total); ${h.checked - h.withTools} declared none.`;
}

// Values starting with these characters can be evaluated as formulas by
// spreadsheet apps, and tool names/descriptions are page-controlled.
function csvCell(value: unknown): string {
  let s = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export function sitesCsv(run: CensusRun): string {
  const header = [
    "url",
    "host",
    "status",
    "http_status",
    "tool_count",
    "read_only_hints",
    "consequential_hints",
    "destructive_hints",
    "declarative",
    "imperative",
    "frames",
    "providers",
    "duration_ms",
    "error",
  ];
  const rows = run.sites.map((site) => {
    const s = summarizeSite(site);
    return [
      s.url,
      s.host,
      s.status,
      s.httpStatus,
      s.toolCount,
      s.readOnlyHints,
      s.consequentialHints,
      s.destructiveHints,
      s.declarative,
      s.imperative,
      s.frames,
      s.providers.join("|"),
      s.durationMs,
      s.error,
    ];
  });
  return csv([header, ...rows]);
}

export function toolsCsv(run: CensusRun): string {
  const header = [
    "site",
    "tool_name",
    "title",
    "description",
    "declarative",
    "provider",
    "hint_read_only",
    "hint_consequential",
    "hint_destructive",
    "hint_untrusted_content",
    "hint_autosubmit",
    "input_params",
    "input_schema_json",
    "page_url",
    "frame_url",
    "is_main_frame",
  ];
  const rows = run.sites.flatMap((site) =>
    site.tools.map((t) => [
      site.host,
      t.name,
      t.title,
      t.description,
      t.declarative,
      t.provider,
      t.annotations.readOnly,
      t.annotations.consequential,
      t.annotations.destructive ?? "",
      t.annotations.untrustedContent,
      t.annotations.autosubmit,
      schemaParams(t.inputSchema).join("|"),
      t.inputSchema ? JSON.stringify(t.inputSchema) : "",
      t.pageUrl,
      t.frameUrl,
      t.isMainFrame,
    ])
  );
  return csv([header, ...rows]);
}

export function schemaParams(schema: Record<string, unknown> | undefined): string[] {
  const props = schema?.properties;
  if (!props || typeof props !== "object") return [];
  const required = new Set(Array.isArray(schema?.required) ? (schema.required as string[]) : []);
  return Object.keys(props).map((k) => (required.has(k) ? `${k}*` : k));
}
