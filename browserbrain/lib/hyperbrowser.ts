// Low-level Hyperbrowser helpers: the persistent volume is the brain, a sandbox mounts
// it to read/write memory files, and scrape gives us the screenshot (the eyes).
//
// SDK shapes verified against installed node_modules/@hyperbrowser/sdk types:
//   volumes.create({name}) -> Volume{id,name}
//   volumes.list() -> {volumes: Volume[]}
//   sandboxes.create({imageName, mounts: {"/brain": {id, type:"rw"}}}) -> SandboxHandle
//   sandbox.files.exists / readText / writeText / list
//   scrape.startAndWait({url, scrapeOptions:{formats}}) -> {data:{markdown,screenshot}}

import { Hyperbrowser } from "@hyperbrowser/sdk";

export const VOLUME_NAME = "browserbrain-memory";
export const MOUNT_PATH = "/brain";

export function client(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not set. Add it to .env.");
  }
  return new Hyperbrowser({ apiKey });
}

// Find the brain volume by name, or create it on first ever run. Reused forever after —
// never create a new volume per request, so memory accumulates in one place.
export async function getVolumeId(hb: Hyperbrowser): Promise<string> {
  const { volumes } = await hb.volumes.list();
  const existing = volumes.find((v) => v.name === VOLUME_NAME);
  if (existing) return existing.id;
  const created = await hb.volumes.create({ name: VOLUME_NAME });
  return created.id;
}

export async function createSandbox(hb: Hyperbrowser, volumeId: string) {
  return hb.sandboxes.create({
    imageName: "node",
    mounts: { [MOUNT_PATH]: { id: volumeId, type: "rw" } },
  });
}

export type SandboxHandle = Awaited<ReturnType<typeof createSandbox>>;

export interface ScrapeResult {
  screenshot?: string; // hosted URL (or base64) of the page screenshot
  markdown?: string; // scraped text, used only as a backup signal
}

// The eyes: capture a screenshot + markdown of the live page.
export async function scrapePage(url: string): Promise<ScrapeResult> {
  const hb = client();
  const job = await hb.scrape.startAndWait({
    url,
    scrapeOptions: {
      formats: ["screenshot", "markdown"],
      screenshotOptions: { fullPage: true, format: "png" },
    },
  });
  if (job.status === "failed") {
    throw new Error(`Scrape failed: ${job.error ?? "unknown error"}`);
  }
  return { screenshot: job.data?.screenshot, markdown: job.data?.markdown };
}
