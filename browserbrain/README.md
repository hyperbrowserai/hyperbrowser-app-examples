# BROWSERBRAIN

Give your agent eyes and a memory.

Paste a URL. BrowserBrain screenshots the page, reads it visually with OpenAI gpt-5.5
(not by parsing HTML), and remembers what it saw in a Hyperbrowser persistent volume.
The first visit to a site is slow because the brain is learning it. Every visit after
that is near-instant recall. The two hero moments: the speed delta between learn and
recall, and the brain surviving a page refresh.

## What it does

- Eyes: Hyperbrowser screenshots the live page; gpt-5.5 vision builds a structured
  understanding — page type, layout, key elements and where they are, what an agent can
  do there. Read off the pixels, not the HTML.
- Memory: that understanding is written to a Hyperbrowser persistent volume
  (`browserbrain-memory`), one file per domain. The volume is the brain.
- Recall: if the brain already knows a domain, the stored memory loads straight from the
  volume — no screenshot, no vision call. The recall path skips all the slow work.

## Hyperbrowser services used

- Stealth browser (visual capture via `scrape` with the screenshot format)
- Sandboxes + persistent volumes (the memory)
- Agents layer (query + act on the recalled memory)

## The flex

Sees once, remembers forever. The brain lives on a persistent volume, so reload the
app and everything it has learned is still there — the Brain panel proves it.

## API

- `POST /api/brain` `{ url }` — recall-or-learn. Streams NDJSON: `step` / `screenshot`
  events on the learn path, then a `result` event with `{ source, memory, ms }`. A
  recall hit returns the result immediately with no intermediate steps.
- `GET /api/brain/list` — every domain the brain knows, read from the volume.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and add your keys:

   ```
   HYPERBROWSER_API_KEY=your_key
   OPENAI_API_KEY=your_key
   ```

3. `npm run dev` and open http://localhost:3000

## Requirements

- The OpenAI key needs credits — the learn path makes one gpt-5.5 vision call.
- The persistent volume needs the `sandbox_volumes` feature flag on your Hyperbrowser
  key. Without it the app runs on a durable local-disk brain (survives reloads and
  restarts) and prints a note; enable the flag and it moves to the Hyperbrowser
  persistent volume automatically, no code change.

---

Built with Hyperbrowser Sandboxes.
