**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# Agent Web Index

Open models can reason — they can't browse on their own. This app puts **GLM-5.2** in a **Hyperbrowser cloud browser**, runs it against **Claude Opus 4.8** and **GPT-5.5** on the same real-site tasks, and shows where each model passes or breaks.

Hyperbrowser provides the browser. Z.ai, Anthropic, and OpenAI provide the models. The harness connects them.

## How it works

1. You paste a supported URL in the app and click **Run site**.
2. **Hyperbrowser** opens a real cloud browser session (Playwright over CDP).
3. The page is read as **text** — links, buttons, visible copy. No screenshots.
4. Each model chooses one action (`click`, `type`, or `done`).
5. The harness executes it in the browser and repeats until the task passes or fails.
6. Results appear in the leaderboard and replay. No mock data.

## Supported sites

These URLs have real tasks and success checks defined:

- `https://news.ycombinator.com`
- `https://developer.mozilla.org/en-US/`
- `https://books.toscrape.com`

## Get an API key

You need keys for Hyperbrowser and all three model providers.

1. **Hyperbrowser** — [Get an API key](https://hyperbrowser.ai)
2. **Z.ai** — for GLM-5.2 ([z.ai](https://z.ai))
3. **Anthropic** — for Claude Opus 4.8
4. **OpenAI** — for GPT-5.5

## Setup

```bash
# install app
npm install

# install harness (Hyperbrowser SDK + Playwright)
cd harness
cp .env.example .env   # add your keys
npm install
cd ..
```

Fill in `harness/.env`:

```bash
HYPERBROWSER_API_KEY=hb-...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5

GLM_BASE_URL=https://api.z.ai/api/paas/v4
GLM_MODEL=glm-5.2
GLM_API_KEY=...

# optional: runs per model (default 3, use 1 for faster demos)
HARNESS_RUNS=1
```

## Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a supported URL, and click **Run site**. Watch the live logs, then see the results below.

## Run from the CLI (optional)

```bash
cd harness
npm run bench:one -- --task=hacker-news-thread
```

Writes real results to `lib/results.json`.

## Project layout

| Path | What it does |
|------|----------------|
| `app/` | Next.js UI + `/api/bench` runner |
| `harness/` | Hyperbrowser sessions, model loop, scoring |
| `harness/browser.ts` | Hyperbrowser SDK + Playwright |
| `harness/models.ts` | GLM, Claude, GPT API calls |
| `lib/results.json` | Output from real runs (empty until you run) |

## Notes

- Hyperbrowser runs the **browser**. It does not natively host GLM-5.2 — the harness calls Z.ai separately.
- Each model run uses its own Hyperbrowser session.
- Only use sites you are allowed to automate. See `harness/tasks.ts`.

---

Follow @hyperbrowser for updates.
