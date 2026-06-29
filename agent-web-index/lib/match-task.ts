import { TASK_CATALOG, type TaskCatalogEntry } from "./task-catalog";

export function normalizeUrl(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

function hostOf(url: string): string {
  return normalizeUrl(url).split("/")[0];
}

export function findTaskByUrl(raw: string): TaskCatalogEntry | null {
  const host = hostOf(raw);
  if (!host) return null;

  return (
    TASK_CATALOG.find((task) => {
      const th = hostOf(task.url);
      return host === th || host.endsWith("." + th) || th.endsWith("." + host);
    }) ?? null
  );
}

export function supportedUrls(): string[] {
  return TASK_CATALOG.map((t) => t.url);
}
