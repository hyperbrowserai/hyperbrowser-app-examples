import { connect, type Browser } from "puppeteer-core";
import { CONFIG } from "./config";
import { getHyperbrowser } from "./hyperbrowser";
import { getMoonshot, withMoonshotBackoff } from "./moonshot";
import { estimateTokens } from "./tokens";
import type { SwarmEvent, SwarmRequest } from "./types";

interface Seed {
  id: number;
  url: string;
  host: string;
}

interface Page {
  index: number;
  url: string;
  title: string;
  content: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Normalize, dedupe, and validate seed URLs. */
export function normalizeSeeds(raw: string[]): Seed[] {
  const seen = new Set<string>();
  const seeds: Seed[] = [];
  for (const line of raw) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let normalized: string;
    try {
      normalized = new URL(withProto).toString();
    } catch {
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    seeds.push({ id: seeds.length, url: normalized, host: hostOf(normalized) });
  }
  return seeds;
}

/** Choose hero seeds, preferring distinct hosts so the tiles look varied. */
function pickHeroSeeds(seeds: Seed[], count: number): Seed[] {
  const byHost: Seed[] = [];
  const usedHosts = new Set<string>();
  for (const s of seeds) {
    if (usedHosts.has(s.host)) continue;
    usedHosts.add(s.host);
    byHost.push(s);
    if (byHost.length >= count) break;
  }
  if (byHost.length < count) {
    for (const s of seeds) {
      if (byHost.includes(s)) continue;
      byHost.push(s);
      if (byHost.length >= count) break;
    }
  }
  return byHost.slice(0, count);
}

/**
 * Runs the full swarm and streams state through `emit`. Never throws for a
 * single page/hero failure — failures are reported honestly as events. Cleans
 * up every real browser session it opens.
 */
export async function runSwarm(
  req: SwarmRequest,
  emit: (e: SwarmEvent) => void,
  signal: AbortSignal
): Promise<void> {
  const startedAt = Date.now();
  const seeds = normalizeSeeds(req.seeds);
  const client = getHyperbrowser();

  const heroSeeds = pickHeroSeeds(seeds, Math.min(CONFIG.heroCount, seeds.length));

  emit({
    t: "init",
    startedAt,
    maxBrowsers: CONFIG.maxBrowsers,
    budgetTokens: CONFIG.contextBudgetTokens,
    hardLimit: CONFIG.contextHardLimit,
    totalSeeds: seeds.length,
    tiles: seeds.map((s) => ({ id: s.id, url: s.url, host: s.host })),
    hero: heroSeeds.map((s) => ({ id: s.id, url: s.url, host: s.host, liveUrl: null })),
  });
  emit({ t: "phase", phase: "spawning" });

  // ── Hero live-view browsers (real sessions, driven over CDP) ──────────────
  const heroSessions: { id: string; browser: Browser | null }[] = [];
  const heroPromise = Promise.allSettled(
    heroSeeds.map(async (seed) => {
      let sessionId: string | null = null;
      try {
        const session = await client.sessions.create({ viewOnlyLiveView: true });
        sessionId = session.id;
        heroSessions.push({ id: session.id, browser: null });
        emit({ t: "hero", id: seed.id, status: "live", liveUrl: session.liveUrl ?? null });
        // Drive the browser to the page so the live view shows a real load.
        await driveHero(session.wsEndpoint, seed.url, seed.id, sessionId, heroSessions, emit, signal);
      } catch (err) {
        emit({
          t: "hero",
          id: seed.id,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  // ── Context buffer (K3 shared memory) ─────────────────────────────────────
  const pages: Page[] = [];
  let contextTokens = 0;
  let capped = false;

  const tryAddPage = (index: number, url: string, title: string, markdown: string): boolean => {
    const content = markdown.slice(0, CONFIG.perPageCharCap);
    const framed = `\n\n=== SOURCE [${pages.length + 1}] ${url} ===\nTITLE: ${title}\n\n${content}\n`;
    const tokens = estimateTokens(framed);
    if (contextTokens + tokens > CONFIG.contextBudgetTokens) {
      capped = true;
      return false;
    }
    pages.push({ index, url, title, content });
    contextTokens += tokens;
    return true;
  };

  // ── Scrape worker pool ────────────────────────────────────────────────────
  emit({ t: "phase", phase: "scraping" });
  let cursor = 0;
  const poolSize = Math.min(CONFIG.maxBrowsers, seeds.length);

  const worker = async () => {
    while (true) {
      if (signal.aborted) return;
      const i = cursor++;
      if (i >= seeds.length) return;
      const seed = seeds[i];

      // Once the context is full, don't spin up more browsers — honest stop.
      if (capped) {
        emit({ t: "tile", id: seed.id, status: "failed", error: "context budget reached" });
        continue;
      }

      emit({ t: "tile", id: seed.id, status: "active" });
      try {
        const res = await client.scrape.startAndWait({
          url: seed.url,
          scrapeOptions: {
            formats: ["markdown"],
            onlyMainContent: true,
            timeout: CONFIG.scrapeTimeoutMs,
          },
          sessionOptions: { useProxy: true, acceptCookies: true, adblock: true },
        });

        const markdown = res.data?.markdown?.trim() ?? "";
        const meta = res.data?.metadata as { title?: string } | undefined;
        const title = (meta?.title || seed.host).slice(0, 200);

        if (res.status !== "completed" || !markdown) {
          emit({ t: "tile", id: seed.id, status: "failed", title, error: res.error || "empty page" });
          continue;
        }

        const added = tryAddPage(seed.id, seed.url, title, markdown);
        emit({ t: "tile", id: seed.id, status: added ? "done" : "failed", title, error: added ? undefined : "context budget reached" });
        emit({ t: "ctx", pagesRead: pages.length, tokens: contextTokens, capped });
      } catch (err) {
        emit({
          t: "tile",
          id: seed.id,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  };

  await Promise.all(Array.from({ length: poolSize }, () => worker()));

  if (signal.aborted) {
    await cleanupHeroes(client, heroSessions, heroPromise);
    return;
  }

  // ── One K3 completion over everything gathered ────────────────────────────
  emit({ t: "phase", phase: "synthesizing" });

  if (pages.length === 0) {
    emit({ t: "error", message: "No pages could be read — every scrape failed. Check the seed URLs." });
    await cleanupHeroes(client, heroSessions, heroPromise);
    return;
  }

  const sites = new Set(pages.map((p) => hostOf(p.url))).size;
  const contextBlock = pages.map((p) => `\n\n=== SOURCE [${p.index}] ${p.url} ===\nTITLE: ${p.title}\n\n${p.content}\n`).join("");

  const system =
    "You are Kimi K3 acting as the shared memory of a swarm of browsers. " +
    `You have just read ${pages.length} web pages in parallel; their full text is provided below. ` +
    "Answer the user's question using ONLY these sources. " +
    "Cite the source URL inline in square brackets after each claim, e.g. [https://example.com]. " +
    "If the question is comparative or asks for a list, use a compact Markdown table with a 'Source' column. " +
    "If the sources are insufficient or conflict, say so plainly. Be precise and do not invent facts.";

  const user = `QUESTION:\n${req.question}\n\nSOURCES (${pages.length} pages):\n${contextBlock}`;

  emit({ t: "phase", phase: "answering" });

  let answerText = "";
  try {
    const moonshot = getMoonshot();
    const stream = await withMoonshotBackoff(
      () =>
        moonshot.chat.completions.create({
          model: CONFIG.moonshotModel,
          stream: true,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      { onRetry: (attempt, waitMs) => emit({ t: "phase", phase: "answering", msg: `Moonshot busy — retry ${attempt} in ${Math.round(waitMs / 1000)}s` }) }
    );

    for await (const chunk of stream) {
      if (signal.aborted) break;
      // Kimi always-on reasoning emits reasoning_content; we consume but don't
      // display it (single-turn call, so no need to resend).
      const delta = chunk.choices?.[0]?.delta?.content ?? "";
      if (delta) {
        answerText += delta;
        emit({ t: "answer", delta });
      }
    }
  } catch (err) {
    emit({ t: "error", message: err instanceof Error ? err.message : String(err) });
    await cleanupHeroes(client, heroSessions, heroPromise);
    return;
  }

  const answerTokens = estimateTokens(answerText);
  const inputTokens = contextTokens + estimateTokens(system + req.question);
  const costUsd = (inputTokens / 1_000_000) * CONFIG.k3InputPricePerM;

  emit({
    t: "done",
    pages: pages.length,
    sites,
    tokens: contextTokens,
    answerTokens,
    elapsedMs: Date.now() - startedAt,
    capped,
    costUsd,
  });

  await cleanupHeroes(client, heroSessions, heroPromise);
}

/** Connect over CDP and keep the hero browser on its page with gentle scrolls. */
async function driveHero(
  wsEndpoint: string,
  url: string,
  heroId: number,
  sessionId: string,
  registry: { id: string; browser: Browser | null }[],
  emit: (e: SwarmEvent) => void,
  signal: AbortSignal
): Promise<void> {
  let browser: Browser | null = null;
  try {
    browser = await connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });
    const entry = registry.find((r) => r.id === sessionId);
    if (entry) entry.browser = browser;
    const existing = await browser.pages();
    const page = existing[0] ?? (await browser.newPage());
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: CONFIG.heroNavTimeoutMs });
    const title = (await page.title().catch(() => "")).slice(0, 200);
    emit({ t: "hero", id: heroId, status: "live", title });
    // Keep it lively until the run ends / client disconnects.
    while (!signal.aborted && browser.connected) {
      await new Promise((r) => setTimeout(r, 3500));
      await page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
    }
  } catch {
    // Session is still live (iframe renders); nav just didn't complete.
  } finally {
    try {
      browser?.disconnect();
    } catch {
      /* ignore */
    }
  }
}

async function cleanupHeroes(
  client: ReturnType<typeof getHyperbrowser>,
  heroSessions: { id: string; browser: Browser | null }[],
  heroPromise: Promise<unknown>
): Promise<void> {
  await Promise.race([heroPromise, new Promise((r) => setTimeout(r, 100))]);
  for (const h of heroSessions) {
    try {
      h.browser?.disconnect();
    } catch {
      /* ignore */
    }
  }
  await Promise.all(
    heroSessions.map((h) => client.sessions.stop(h.id).catch(() => undefined))
  );
}
