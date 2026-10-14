import { config } from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { parseArgs } from "util";
import { DEFAULTS, runCensus } from "../lib/census";
import { createMockScanner } from "../lib/mock";
import { headline, headlineSentence, sitesCsv, summarizeSite, toolsCsv } from "../lib/summary";
import type { CensusRun } from "../lib/types";

config({ path: [".env.local", ".env"], quiet: true });

const { values } = parseArgs({
  options: {
    sites: { type: "string", default: "sites.txt" },
    url: { type: "string", multiple: true },
    out: { type: "string", default: "data" },
    concurrency: { type: "string", default: String(DEFAULTS.concurrency) },
    timeout: { type: "string", default: String(DEFAULTS.timeoutMs / 1000) },
    settle: { type: "string", default: String(DEFAULTS.settleMs / 1000) },
    limit: { type: "string" },
    mock: { type: "boolean", default: false },
    fixture: { type: "string", default: "fixtures/sample-results.json" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`Usage: npm run census -- [options]

  --sites <file>       URL list, one per line, # comments allowed (default: sites.txt)
  --url <url>          Check a specific URL instead of the file (repeatable)
  --out <dir>          Output directory (default: data)
  --concurrency <n>    Parallel Hyperbrowser sessions (default: ${DEFAULTS.concurrency})
  --timeout <sec>      Per-site budget in seconds (default: ${DEFAULTS.timeoutMs / 1000})
  --settle <sec>       Max wait for late tool registration (default: ${DEFAULTS.settleMs / 1000})
  --limit <n>          Only check the first n URLs
  --mock               Replay --fixture instead of opening sessions (no API key needed)
  --fixture <file>     Fixture used by --mock (default: fixtures/sample-results.json)`);
  process.exit(0);
}

function positiveInt(name: string, raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`--${name} must be a positive number, got "${raw}"`);
    process.exit(1);
  }
  return n;
}

async function readSites(file: string): Promise<string[]> {
  const text = await fs.readFile(file, "utf8");
  const urls = text
    .split("\n")
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter(Boolean);
  return [...new Set(urls)];
}

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));

async function main() {
  let urls = values.url?.length ? values.url : await readSites(values.sites);
  if (values.limit) urls = urls.slice(0, positiveInt("limit", values.limit));
  if (urls.length === 0) {
    console.error("No URLs to check.");
    process.exit(1);
  }

  const concurrency = Math.floor(positiveInt("concurrency", values.concurrency));
  const timeoutMs = positiveInt("timeout", values.timeout) * 1000;
  const settleMs = positiveInt("settle", values.settle) * 1000;

  let scanner;
  if (values.mock) {
    const fixture = JSON.parse(await fs.readFile(values.fixture, "utf8")) as CensusRun;
    scanner = createMockScanner(fixture);
    console.log(`Mock mode: replaying ${values.fixture} (no browser sessions are opened).`);
  } else if (!process.env.HYPERBROWSER_API_KEY) {
    console.error(
      "HYPERBROWSER_API_KEY is not set. Add it to .env.local, or run `npm run census:mock`."
    );
    process.exit(1);
  }

  console.log(
    `Checking ${urls.length} site(s), concurrency ${concurrency}, ${timeoutMs / 1000}s per site.\n`
  );

  const run = await runCensus(urls, {
    concurrency,
    timeoutMs,
    settleMs,
    mode: values.mock ? "mock" : "live",
    scanner,
    onResult(result, done, total) {
      const s = summarizeSite(result);
      const label =
        result.status === "ok"
          ? s.toolCount > 0
            ? `${s.toolCount} tool(s)`
            : "0 tools"
          : `${result.status}: ${result.error ?? ""}`;
      const http = s.httpStatus && s.httpStatus >= 400 ? ` (HTTP ${s.httpStatus})` : "";
      console.log(
        `[${String(done).padStart(String(total).length)}/${total}] ${pad(result.url, 58)} ${label}${http}`
      );
    },
  });

  await fs.mkdir(values.out, { recursive: true });
  const jsonPath = path.join(values.out, "results.json");
  const sitesPath = path.join(values.out, "sites.csv");
  const toolsPath = path.join(values.out, "tools.csv");
  await fs.writeFile(jsonPath, JSON.stringify(run, null, 2) + "\n");
  await fs.writeFile(sitesPath, sitesCsv(run));
  await fs.writeFile(toolsPath, toolsCsv(run));

  const h = headline(run);
  const ranked = run.sites
    .map(summarizeSite)
    .filter((s) => s.toolCount > 0)
    .sort((a, b) => b.toolCount - a.toolCount);

  console.log(`\n${headlineSentence(h)}`);
  if (h.failed > 0) console.log(`${h.failed} site(s) timed out or errored; see ${sitesPath}.`);
  if (ranked.length > 0) {
    console.log("\nSites that declare WebMCP tools:");
    for (const s of ranked) {
      console.log(
        `  ${pad(s.url, 58)} ${String(s.toolCount).padStart(3)} tools  ` +
          `(${s.imperative} imperative, ${s.declarative} declarative, ${s.readOnlyHints} hinted read-only)`
      );
    }
  } else {
    console.log(
      "\nWebMCP is a proposed standard, so zero is the expected answer for most sites right now."
    );
  }
  console.log(`\nWrote ${jsonPath}, ${sitesPath}, ${toolsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
