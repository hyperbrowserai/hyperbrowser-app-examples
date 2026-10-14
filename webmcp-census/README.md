**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# WebMCP Census

Which websites are agent-ready today? WebMCP Census opens each site on a list in a Hyperbrowser cloud browser with [WebMCP](https://hyperbrowser.ai/docs/sessions/webmcp) enabled, lists every tool the site declares across its tabs and frames, and ranks the results in a sortable leaderboard. The headline is a plain number: "we checked N sites, K of them declare tools."

It is read-only. The census lists tools and never calls them.

## Why it matters

[WebMCP](https://github.com/webmachinelearning/webmcp) lets a page register named tools, each with a description and a JSON Schema, for example `searchFlights` or `read-page`. An agent can then call the site's own code instead of clicking through the UI from screenshots. Whether that takes off depends on adoption, and adoption can be measured: open the page in a browser that supports WebMCP and ask what it declares.

### How this differs from `web-to-agent`

[`web-to-agent`](../web-to-agent) uses an LLM to guess which tools a page could offer based on its layout. WebMCP Census uses no LLM and guesses nothing. It only reports tools that a site registers itself through `document.modelContext.registerTool()` or `<form toolname>`.

## Caveats

- **WebMCP is a proposed standard.** It is a W3C community-group draft that Chrome ships behind an origin trial. Most sites declare nothing, and "0 tools" is the expected result for most of the web right now, not a failure. The UI and CLI say so directly.
- **Annotations are hints, not permissions.** Tool names, descriptions, schemas, and annotations such as `readOnly` are written by the page. From the Hyperbrowser docs: *"Annotations such as `readOnly` are hints, not authorization to perform an action."* The census shows them verbatim and labels them as unverified. A count of "readOnly hint" tools is a count of what sites *claim*.
- **Nothing is bypassed.** Sessions are created with only `enableWebMcp: true`, with no stealth, proxies, or CAPTCHA solving. If a site blocks the browser (for example with HTTP 403), the census records that and moves on.
- **Discovery is a snapshot.** A site may register tools only on some pages, only after login, or only after an interaction. The census checks the URL you give it after load, plus a short settle window.

## How it works

1. `sites.txt` lists the URLs. Each one gets its own session from `client.sessions.create({ enableWebMcp: true })`.
2. Playwright (`playwright-core`) connects over CDP and navigates to the URL.
3. `client.sessions.webmcp.listTools(sessionId)` is polled until the tool count is stable or the settle window (default 6s) ends, since many sites register tools after load.
4. For each tool, the census records its name, title, description, input/output schema, annotations, declarative vs. imperative, native vs. polyfill provider, and source tab/frame.
5. The session is stopped in a `finally` block. If session creation finishes after the per-site deadline, that session is stopped as soon as it arrives.
6. Results go to `data/results.json`, `data/sites.csv`, and `data/tools.csv`, and the leaderboard reads them.

Sites run with a concurrency limit (default 3) and a per-site time budget (default 45s).

## Setup

```bash
cd webmcp-census
npm install
cp .env.example .env.local
# add HYPERBROWSER_API_KEY
```

```
HYPERBROWSER_API_KEY=
```

Get a key at [hyperbrowser.ai](https://hyperbrowser.ai).

## Run the census (CLI)

```bash
npm run census                                   # every URL in sites.txt
npm run census -- --concurrency 5 --timeout 60   # tune parallelism and per-site budget (seconds)
npm run census -- --sites my-sites.txt           # your own list
npm run census -- --url https://vercel.com       # one-off URL (repeatable)
npm run census -- --help
```

Output goes to `data/`:

| File | Contents |
|------|----------|
| `data/results.json` | Full run: settings, per-site status, every tool with schemas and annotations |
| `data/sites.csv` | One row per site: tool counts, hint counts, status, HTTP status, timing |
| `data/tools.csv` | One row per tool: name, description, hints, input params, raw schema |

CSV cells that start with `=`, `+`, `-`, or `@` are prefixed with `'` because tool text is page-controlled and would otherwise be evaluated as a formula by spreadsheet apps.

### No API key? Use mock mode

```bash
npm run census:mock
```

Mock mode replays `fixtures/sample-results.json` (a real live run, see below) through the same pipeline, including the worker pool and the JSON/CSV writers, without opening any sessions. URLs that aren't in the fixture come back as zero-tool sites.

## Run the leaderboard (web UI)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page shows `data/results.json` if it exists, and otherwise falls back to the committed fixture. It says which file it is showing.

- Click a column header to sort. Click a row to see that site's tools, including descriptions, hint badges, input parameters, the raw schema, and the source frame.
- **Only sites with tools** hides zero-tool rows, and the filter box matches site or tool names.
- **List tools** checks one more URL live through `POST /api/scan`. This needs the key on the server, and the result is not saved.
- Downloads: `/api/export/results.json`, `/api/export/sites.csv`, `/api/export/tools.csv`.

## Sample output

From a live run on 2026-10-14 against the default `sites.txt` (67 URLs: 45 popular sites plus 22 pages that public directories list as WebMCP demos or adopters). This run is committed as `fixtures/sample-results.json`.

```
Checking 67 site(s), concurrency 5, 45s per site.

[ 1/67] https://www.amazon.com/                                    0 tools
[ 2/67] https://www.reddit.com/                                    0 tools (HTTP 403)
...
[33/67] https://www.yelp.com/                                      error: navigation: page.goto: net::ERR_HTTP_RESPONSE_CODE_FAILURE
[38/67] https://www.cloudflare.com/                                2 tool(s)
[39/67] https://vercel.com/                                        5 tool(s)
...

We checked 67 sites. 23 declared WebMCP tools (139 tools in total); 44 declared none.
1 site(s) timed out or errored; see data/sites.csv.

Sites that declare WebMCP tools:
  https://admintoolkit.io/                                    24 tools  (24 imperative, 0 declarative, 24 hinted read-only)
  https://mgifford.github.io/wsg-webmcp-experiment/           17 tools  (17 imperative, 0 declarative, 0 hinted read-only)
  https://webconverter.app/webmcp.html                        15 tools  (15 imperative, 0 declarative, 15 hinted read-only)
  ...
  https://vercel.com/                                          5 tools  (5 imperative, 0 declarative, 0 hinted read-only)
  https://www.cloudflare.com/                                  2 tools  (2 imperative, 0 declarative, 2 hinted read-only)
  ...
```

How to read these numbers: of the 45 mainstream sites, only **vercel.com** (`ask-vercel`, `vercel.open_documentation`, ...) and **cloudflare.com** (`read-page`, `search`) declared tools on their homepage. The other 21 sites that declared tools came from the hand-picked list of known adopters, so they say nothing about adoption across the wider web. Reddit, Stack Overflow, and Zillow returned HTTP 403 to a plain cloud browser, so their results only cover the error page. These are counts of tools the sites declare, not tools anyone has verified.

## Optional: calling tools on a demo page we control

The census never calls tools. To show what calling looks like, `npm run demo` uses `demo/demo-page.html`, a small page in this repo that registers two harmless tools that only touch in-page state:

- `get_census_fact` is imperative and hinted read-only. It is called once with a **blocking** `webmcp.invoke` and returns `completed` with a static JSON result.
- `request_census_badge` is a declarative `<form toolname>` without `toolautosubmit`. It is started with `webmcp.start`. The browser fills in the form and the invocation reports **`awaiting_submission`**. The script prints the session's Live View URL. Open it, press **Submit**, and the script picks up the `completed` result through `webmcp.getResult`.

```bash
npm run demo                  # waits up to 300s for you to press Submit in Live View
npm run demo -- --wait 120
npm run demo -- --auto-submit # clicks Submit from the script (for unattended runs)
```

The cloud browser can't reach your `localhost`, so the script serves the demo page to the session through Playwright request interception on the reserved `webmcp-census-demo.test` host. It only invokes tools whose `source.pageUrl` is that host.

## Seed list

`sites.txt` has one URL per line, with `#` comments. The second half lists pages referenced as WebMCP adopters by [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools) and [webmachinelearning/awesome-webmcp](https://github.com/webmachinelearning/awesome-webmcp). Being listed there is a third-party claim. The census checks it.

## Project layout

| Path | What it does |
|------|--------------|
| `lib/census.ts` | Session lifecycle, discovery polling, deadlines, worker pool |
| `lib/summary.ts` | Per-site summaries, headline sentence, CSV writers |
| `lib/mock.ts` | Fixture-replay scanner for `--mock` |
| `lib/data.ts` | Loads `data/results.json` or the fixture for the UI |
| `scripts/census.ts` | CLI |
| `scripts/demo.ts` | Optional invoke / `awaiting_submission` demo |
| `demo/demo-page.html` | The demo page with two harmless tools |
| `app/`, `components/` | Next.js leaderboard, `/api/scan`, `/api/export/[file]` |
| `sites.txt` | Editable seed list |
| `fixtures/sample-results.json` | A real live run, used by mock mode and as the UI fallback |

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- `@hyperbrowser/sdk` (`sessions.create({ enableWebMcp: true })`, `sessions.webmcp.*`, `sessions.stop`)
- `playwright-core` for CDP navigation
- `tsx` for the CLI

---

Follow @hyperbrowser for updates.
