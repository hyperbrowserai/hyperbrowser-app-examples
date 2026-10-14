import type { ScanOptions } from "./census";
import { normalizeUrl } from "./census";
import type { CensusRun, SiteResult } from "./types";

/**
 * Replays recorded results instead of opening browser sessions, so the CLI
 * pipeline and leaderboard can be demoed without an API key. URLs missing
 * from the fixture come back as reachable sites with zero tools.
 */
export function createMockScanner(fixture: CensusRun) {
  const byUrl = new Map(fixture.sites.map((s) => [normalizeUrl(s.url), s]));
  return async (rawUrl: string, opts: ScanOptions): Promise<SiteResult> => {
    const url = normalizeUrl(rawUrl);
    const host = new URL(url).hostname.replace(/^www\./, "");
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
    const recorded = byUrl.get(url);
    if (recorded) {
      return { ...recorded, url, checkedAt: new Date().toISOString() };
    }
    return {
      url,
      host,
      status: "ok",
      nativeSupported: true,
      truncated: false,
      durationMs: Math.min(opts.timeoutMs, 4_000),
      checkedAt: new Date().toISOString(),
      tools: [],
    };
  };
}
