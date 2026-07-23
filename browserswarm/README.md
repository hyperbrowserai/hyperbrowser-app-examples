# Browserswarm

**One brain, a swarm of browsers.** One [Kimi K3](https://platform.moonshot.ai) model
acts as a single shared memory; N concurrent [Hyperbrowser](https://hyperbrowser.ai)
cloud browsers act as its eyes. You ask a research question and hand it seed URLs;
the swarm fans out, reads every page in parallel, streams all of it into one K3
context, and K3 answers from everything it saw — in a single prompt.

The UI is a mission-control wall: a grid of page-job tiles that light up in waves,
a few hero tiles embedding **real** browser Live Views, and a bottom context meter
showing K3's shared memory fill left→right. **Every number on screen is real and
live** — active browsers, pages read, token estimates (labeled `est`), elapsed time.

## Quickstart

```bash
# 1. install
npm install

# 2. add your keys
cp .env.example .env.local
#   HYPERBROWSER_API_KEY=...   (https://hyperbrowser.ai)
#   MOONSHOT_API_KEY=...       (https://platform.moonshot.ai)

# 3. run
npm run dev
# → http://localhost:3000
```

On load the app runs a **preflight**: it confirms the Hyperbrowser key is present
and makes a real 1-token K3 call, so a missing key or a bad model string surfaces
immediately instead of crashing mid-run. Click **Load example** to prefill a
question + seed URLs, then **Release the swarm**.

## Architecture

```
Browser (client)                     Server (Next.js, node runtime)
────────────────                     ──────────────────────────────
InputPanel ─ question + seed URLs ──► POST /api/swarm  (streaming NDJSON)
                                         │
useSwarm() reads the NDJSON stream ◄─────┤  lib/orchestrator.ts
  → MissionBar   (live browsers, timer)  │   • hero sessions (viewOnlyLiveView)
  → Wall         (tiles + Live Views)    │     driven over CDP (puppeteer-core)
  → BrainMeter   (context fill)          │   • scrape worker pool, size =
  → AnswerView   (streamed K3 answer)    │     min(MAX_BROWSERS, #seeds)
                                         │       client.scrape.startAndWait(...)
GET /api/preflight ◄─── on page load ────┤   • context assembler → one buffer
                                         │   • one streamed K3 completion
                                         ▼
                            Hyperbrowser SDK  +  Kimi K3 (OpenAI-compatible)
```

- **The swarm** — `client.scrape.startAndWait` is the workhorse; a fixed-size
  worker pool pulls seed URLs and scrapes each to markdown. Each finished page is
  framed with its source URL and appended to one running K3 context buffer.
- **Hero tiles** — scrape jobs don't expose a Live View, so the hero tiles use a
  handful of real `client.sessions.create({ viewOnlyLiveView: true })` sessions,
  each driven to a page over CDP so you watch real browsers load. If a session
  can't be driven it degrades honestly (the Live View still renders).
- **Streaming** — the whole run happens inside one streaming POST; the server
  emits NDJSON events (`tile`, `hero`, `ctx`, `phase`, `answer`, `done`, `error`)
  and the client renders them. No polling, no shared server state.
- **One prompt** — on completion the entire buffer plus your question goes to K3
  in a single completion, streamed back token by token. K3 is asked to cite a
  source URL per claim (and use a table for comparative questions).

### The context-budget cap

The K3 buffer is capped at `CONTEXT_BUDGET_TOKENS` (default **700,000 est tokens**,
below the 1M model limit). Token counts are a cheap `~chars/4` estimate and are
**always labeled `(est)`** — never presented as exact tokenizer counts. Each page
is also capped at `PER_PAGE_CHAR_CAP` so one giant page can't eat the budget. When
the buffer fills, the swarm stops accepting new pages, the meter shows **CONTEXT
FULL**, and remaining tiles report `budget full` — honestly.

### Concurrency

The Hyperbrowser SDK exposes no account-level concurrency endpoint, so
`MAX_BROWSERS` (default **25**) is the honest ceiling and is shown as a `cap`. The
big "browsers live" number is the **real** count of open browsers right now
(in-flight scrape jobs + live hero sessions) — nothing is pre-seeded or decorative.

### Cost

Kimi K3 input is **~$3 / 1M tokens**, so a full ~700K-token run costs **≈ $2–3**
of input (plus a small output cost). The bottom meter and the final stats line show
a live estimated dollar figure, labeled as an estimate. Moonshot is capacity-strained;
429s are retried with exponential backoff + jitter and surfaced in the phase chip
rather than crashing the run.

## Config

All defaults live in `lib/config.ts` and are overridable via `.env.local`:
`MAX_BROWSERS`, `HERO_BROWSERS`, `CONTEXT_BUDGET_TOKENS`, `PER_PAGE_CHAR_CAP`,
`SCRAPE_TIMEOUT_MS`, `MOONSHOT_BASE_URL`, `MOONSHOT_MODEL`.

Built with [Hyperbrowser](https://hyperbrowser.ai). Design language shared with AgentRank.
