# Agent Web Index — Harness

Drives three models through the **same** Hyperbrowser cloud browser, on the
**same** tasks, with the **same** text-DOM observation, and scores pass/fail
over N runs. Writes real `Site[]` output to `../lib/results.json` (the only file
the web app reads) and saves every transcript.

- **GLM-5.2** (open) — OpenAI-compatible endpoint (Z.ai hosted or self-hosted vLLM/SGLang)
- **Claude Opus 4.8** (closed) — `@anthropic-ai/sdk`, model `claude-opus-4-8`
- **GPT-5.5** (closed) — OpenAI SDK

## The core principle

All three models get the identical system prompt and the identical observation:
the page serialized to **text** (interactive elements with stable indices +
visible text), never a screenshot. GLM-5.2 has no vision, so text-DOM is the
only level playing field. The single thing that swaps per model is which API
endpoint `decideAction` calls. Browser, observation, action execution, and
scoring are identical.

## The loop (per task, per model, per run)

1. Open a Hyperbrowser session, connect Playwright over CDP (`&keepAlive=true`).
2. Serialize the page to text.
3. Ask the model under test for ONE next action as JSON (`click` / `type` / `done`).
4. Execute it via Playwright.
5. Repeat until the task's `success(page)` check passes, the model emits `done`,
   or the 20-step cap is hit.
6. Score pass/fail; write the full transcript to `transcripts/`.

Each task runs `HARNESS_RUNS` times per model (default 3) and is aggregated to a
success rate. Difficulty is computed as `round((1 - mean success) * 100)`. The
"where it breaks" note and the replay shown in the app are both derived from
real recorded runs — nothing is invented.

## Run it

```bash
cd harness
cp .env.example .env        # fill in keys + confirmed model strings
npm install
npx playwright install chromium   # Playwright connects over CDP; this is the client
npm run bench
```

Then start the web app (`cd .. && npm run dev`) — it now renders the real board.

## Configure the tasks

Edit `tasks.ts`. **Fair-game sites only** — no identity verification, no
ticketing, nothing whose ToS forbids automation. "Hard" must come from genuine
difficulty (heavy SPAs, multi-step flows, bot-protected public pages you are
permitted to test). The three seeded tasks are examples; replace them.

## Verify before trusting numbers

The model strings for GLM-5.2 and GPT-5.5 are env vars on purpose — set them to
the confirmed strings for your access path. The Hyperbrowser `sessions.create`
params (`acceptCookies`, `timeoutMinutes`) and the `&keepAlive=true` connection
were written against the documented pattern; confirm them against the installed
`@hyperbrowser/sdk` types after `npm install`.

## The seam

`../lib/results.json` plus the optional screenshots under `../public` are the
only things the app consumes. Real data drops in with zero UI changes. A future
live Hyperbrowser view swaps only the viewport in `../components/browser-window.tsx`.
