# Hyperbrowser App Examples

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A520.9-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14%E2%80%9316-black.svg?logo=nextdotjs)](https://nextjs.org/)

Fully working web apps built on [Hyperbrowser](https://hyperbrowser.ai) — cloud browsers and sandboxes for AI agents, scraping, and automation.

This is not a monorepo with a shared toolchain. Each directory is an independent application with its own `package.json`, environment variables, and README. Clone the repo, pick an example, and run it on its own.

**Repository:** [github.com/hyperbrowserai/hyperbrowser-app-examples](https://github.com/hyperbrowserai/hyperbrowser-app-examples)

## Contents

- [What this repository is](#what-this-repository-is)
- [What is Hyperbrowser](#what-is-hyperbrowser)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [How to pick an example](#how-to-pick-an-example)
- [Example catalog](#example-catalog)
  - [Agent evaluation and site readiness](#agent-evaluation-and-site-readiness)
  - [Agent memory and navigation](#agent-memory-and-navigation)
  - [Parallel research and swarms](#parallel-research-and-swarms)
  - [Research and intelligence](#research-and-intelligence)
  - [Skills, datasets, and documentation](#skills-datasets-and-documentation)
  - [Design systems](#design-systems)
  - [Web automation and APIs](#web-automation-and-apis)
  - [Content and media](#content-and-media)
  - [Monitoring and UX](#monitoring-and-ux)
  - [Sandboxes and visual builders](#sandboxes-and-visual-builders)
  - [Hiring and jobs](#hiring-and-jobs)
- [Running an example](#running-an-example)
- [Environment variables](#environment-variables)
- [Hyperbrowser capabilities these apps use](#hyperbrowser-capabilities-these-apps-use)
- [Repository layout](#repository-layout)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)
- [Related projects](#related-projects)

## What this repository is

A collection of **46 standalone example apps** that show how to use Hyperbrowser in real product surfaces: live browser views, scrape-and-synthesize research tools, computer-use agents, cloud sandboxes, design extraction, dataset generation, and more.

Use them to:

- Learn Hyperbrowser SDK patterns (sessions, scrape, `web.fetch`, Browser Use / Computer Use agents, sandboxes)
- Fork a starting point instead of scaffolding from scratch
- See how cloud browsers pair with OpenAI, Anthropic, Gemini, Kimi, Together, and others

These are **examples**, not a supported product suite. Quality, completeness, and operational hardening vary by app. Always read the app’s own README before you run it, and only automate sites you are allowed to access.

## What is Hyperbrowser

[Hyperbrowser](https://hyperbrowser.ai) provides **fast cloud browsers and sandboxes** for AI automation, large-scale scraping, and agentic code execution.

Typical building blocks used in this repo:

| Capability | What apps do with it |
| --- | --- |
| **Cloud browser sessions** | Launch a remote Chromium, connect over CDP (Playwright / Puppeteer), optionally embed a Live View |
| **Scrape / `web.fetch`** | Pull markdown, links, screenshots, or structured formats (including branding) from a URL |
| **Stealth, proxies, CAPTCHA** | Run against sites that block naive scrapers |
| **Browser / Computer Use agents** | Let a model click, type, and navigate inside a real browser |
| **Sandboxes** | Give an agent a cloud computer: files, shell, browse, expose a public port |
| **Persistent volumes** | Keep memory or files across runs (for example BrowserBrain) |

Get an API key from the [Hyperbrowser dashboard](https://app.hyperbrowser.ai/quickstart). Docs: [hyperbrowser.ai/docs](https://www.hyperbrowser.ai/docs). Node SDK: [`@hyperbrowser/sdk`](https://www.npmjs.com/package/@hyperbrowser/sdk).

## Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node.js 20.9+** | Recommended for every app. Required for Next.js 16 examples. Next.js 14/15 apps can run on Node 18.18+. |
| **npm** | Documented installer in every app. yarn/pnpm usually work if you prefer them. |
| **Hyperbrowser API key** | Almost every app. Sign up at [hyperbrowser.ai](https://hyperbrowser.ai). |
| **A model provider key** | Most apps also need OpenAI, Anthropic, or another LLM. See [Environment variables](#environment-variables). |
| **Docker** | Only [hyperplex](./hyperplex) (Redis + Postgres). |
| **FFmpeg** | Only [sora-research](./sora-research) (and [assets-optimizer](./assets-optimizer) uses FFmpeg for video posters). |

You do **not** install anything at the repository root. There is no root `package.json`.

## Quick start

```bash
git clone https://github.com/hyperbrowserai/hyperbrowser-app-examples.git
cd hyperbrowser-app-examples
```

Pick a directory, then follow that app’s README. The usual Next.js path:

```bash
cd hypervision          # or any other example
npm install

# Create env file (name varies — see the app README)
cat > .env.local << 'EOF'
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key
EOF

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

A first run that needs only a Hyperbrowser key (no second LLM):

```bash
cd designmd-url && npm install && npm run dev
```

DESIGNMD takes the key in the browser (localStorage). Live demo: [designmd.hyperbrowser.ai](https://designmd.hyperbrowser.ai).

## How to pick an example

| If you want to… | Start here |
| --- | --- |
| Embed a **Live View** of a real cloud browser | [hyperscript](./hyperscript), [agent-rank](./agent-rank), [browserswarm](./browserswarm), [hyperlearn](./hyperlearn) |
| Run **Computer Use / Browser Use** agents | [agent-rank](./agent-rank), [o5-automation](./o5-automation), [hyperswarm](./hyperswarm), [hb-ui-bot-app](./hb-ui-bot-app) |
| Give an agent a **cloud computer (sandbox)** | [hyperview](./hyperview), [hyperharness](./hyperharness) |
| Scrape a page and turn it into **structured output** | [hyperfetch](./hyperfetch), [designmd-url](./designmd-url), [hyperdatalab](./hyperdatalab) |
| Fan out **many browsers in parallel** | [browserswarm](./browserswarm), [hyperswarm](./hyperswarm), [hyperplex](./hyperplex) |
| Build **SKILL.md / agent memory** from the live web | [hyperskills](./hyperskills), [hyperlearn](./hyperlearn), [hypergraph](./hypergraph) |
| Turn a site into an **API, dataset, or agent tools** | [scrape-to-api](./scrape-to-api), [site-to-dataset](./site-to-dataset), [web-to-agent](./web-to-agent) |
| Score **agent-operability or AI-search visibility** | [agent-rank](./agent-rank), [hyperrank](./hyperrank), [hyperharness](./hyperharness) |
| Watch a **CLI** instead of a web UI | [churnhunter](./churnhunter) |

## Example catalog

Every app has its own README with setup, env vars, and usage. Keys listed below are the ones you typically need; optional integrations are in each README.

### Agent evaluation and site readiness

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [agent-rank](./agent-rank) | AgentRank | Runs Claude Computer Use, OpenAI CUA, and Gemini Computer Use on your site in parallel and scores agent-operability (0–100). | `HYPERBROWSER_API_KEY`, `ANTHROPIC_API_KEY` |
| [agent-web-index](./agent-web-index) | Agent Web Index | Benchmarks GLM-5.2 vs Claude Opus and GPT on the same real-site tasks inside Hyperbrowser sessions. Includes a CLI harness. | Hyperbrowser + Anthropic + OpenAI + Z.ai (`GLM_*`) |
| [hyperharness](./hyperharness) | HyperHarness | Clones a public GitHub repo into a sandbox, runs an OpenAI coding agent on test tasks, and writes `CLAUDE.md` / `AGENTS.md` plus a HarnessScore. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [hyperrank](./hyperrank) | HyperRank | Scores how AI search engines describe your brand from buyer-intent prompts. | `HYPERBROWSER_API_KEY`, `ANTHROPIC_API_KEY` |

### Agent memory and navigation

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [browserbrain](./browserbrain) | BrowserBrain | Screenshots a page, understands it with vision (not HTML parsing), and stores recall on a Hyperbrowser persistent volume. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [o5-automation](./o5-automation) | Browser Agent Navigation Memory | Claude Computer Use completes a task in a cloud browser and writes portable navigation memory under `.memory/<domain>.json`. | `HYPERBROWSER_API_KEY`, `ANTHROPIC_API_KEY` |

### Parallel research and swarms

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [browserswarm](./browserswarm) | Browserswarm | N concurrent cloud browsers scrape seed URLs; one Kimi K3 model answers from the combined context. Mission-control UI with real Live Views. | `HYPERBROWSER_API_KEY`, `MOONSHOT_API_KEY` |
| [hyperswarm](./hyperswarm) | HyperSwarm | Splits a research goal into subtasks, launches parallel Browser Use agents with live views, and synthesizes ranked answers. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [hyperplex](./hyperplex) | Hyperplex | Full research engine: planner, queued subagents (Claude / GPT / Gemini), Hyperbrowser scrape, cited SSE answer. Needs Redis, Postgres, and a worker. | `HYPERBROWSER_API_KEY`, `DATABASE_URL`, `REDIS_URL`, plus at least one LLM key |

### Research and intelligence

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [hyper-research](./hyper-research) | AI Research Tool | Scrape 2–10 URLs, then synthesize insights, comparison tables, and charts. Keys can be entered in the in-app Settings UI. | `HYPERBROWSER_API_KEY`, Anthropic (and optional OpenAI) |
| [hyperfetch](./hyperfetch) | Hyperfetch | Turns a URL into a structured intelligence brief (facts, stats, tables, entities, citations). | `HYPERBROWSER_API_KEY`, `ANTHROPIC_API_KEY` |
| [openai-source-forge](./openai-source-forge) | OpenAI SourceForge | Classifies a question, scrapes Scholar/PubMed or developer docs, and answers with clickable citations and optional API discovery. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [universal-chatbot](./universal-chatbot) | Universal Chatbot | Chat over the latest content of one or more websites. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [yc-research-bot](./yc-research-bot) | YC Research Bot | Founder intelligence over the YC directory: scrape, deep research, batch analysis, digests, Slack/Notion. See [ENVIRONMENT_SETUP.md](./yc-research-bot/ENVIRONMENT_SETUP.md). | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` (+ optional Slack, Notion, Resend) |
| [deep-reddit-researcher](./deep-reddit-researcher) | Deep Reddit Researcher | Reddit research with stealth browsing, live screenshots, and Q&A over extracted threads. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [mediresearch](./mediresearch) | Medi-Research | Upload a lab report; extract results and crawl Mayo Clinic / NIH / PubMed for evidence-backed context. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [sora-research](./sora-research) | Sora Video Analyzer | Transcribe and keyframe an AI video, infer the generation prompt, and scrape platform pricing. Requires local FFmpeg. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |

### Skills, datasets, and documentation

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [skills-generator](./skills-generator) | HyperSkill (base) | Search (Serper) → scrape (Hyperbrowser) → write a `SKILL.md` with OpenAI. | `SERPER_API_KEY`, `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [hyperskills](./hyperskills) | HyperSkill (extended) | Same idea as `skills-generator`, plus Batch Mode, Vision Mode (Claude on screenshots), and skill-tree generation. | Serper + Hyperbrowser + OpenAI + Anthropic (vision) |
| [hyperlearn](./hyperlearn) | HyperLearn | A HyperAgent browses live docs while OpenAI writes interconnected skill files (file tree + graph, ZIP download). | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [hypergraph](./hypergraph) | HyperGraph | Discovers sources (Serper), scrapes them, and builds a downloadable skill graph (MOC, concepts, patterns, gotchas). | `HYPERBROWSER_API_KEY`, `SERPER_API_KEY`, `OPENAI_API_KEY` |
| [site-to-dataset](./site-to-dataset) | Site-to-Dataset | Crawls docs (1–50 pages) into scored Q/A pairs with JSONL export. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [hyperdatalab](./hyperdatalab) | HyperDataLab | Turns a webpage into structured question–answer pairs. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [documentation-buddy](./documentation-buddy) | Documentation Buddy | Crawls a docs site and serves a streaming chatbot over that corpus. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |

### Design systems

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [designmd-url](./designmd-url) | DESIGNMD | Extracts a Google-style `DESIGN.md` via `web.fetch` with `formats: ["branding"]` — no second LLM. [Live demo](https://designmd.hyperbrowser.ai). | Hyperbrowser key in the browser (optional server `HYPERBROWSER_API_KEY`) |
| [hyperdesign](./hyperdesign) | HyperDesign | Screenshot + scrape → Claude writes a tokenized `DESIGN.md` with a live preview. | `HYPERBROWSER_API_KEY`, `ANTHROPIC_API_KEY` |

### Web automation and APIs

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [agent-map](./agent-map) | Agent Map | Crawls a site into an agent-ready map: page nodes, link flows, summaries, JSON/markdown export. | `HYPERBROWSER_API_KEY` |
| [deep-crawler-bot](./deep-crawler-bot) | DeepCrawler | Discovers hidden API endpoints and can export a Postman collection. | `HYPERBROWSER_API_KEY` |
| [scrape-to-api](./scrape-to-api) | Scrape-to-API | Point-and-click element selection → REST endpoint + OpenAPI + TypeScript SDK + Postman bundle. | `HYPERBROWSER_API_KEY` |
| [web-to-agent](./web-to-agent) | Web-to-Agent | Stealth crawl → classify UI → generate and live-test TypeScript agent tools (Together AI). | `HYPERBROWSER_API_KEY`, `TOGETHER_API_KEY` |
| [flow-mapper](./flow-mapper) | FlowMapper | Crawls user flows into interactive diagrams plus Playwright tests, XState components, and Postman collections. | `HYPERBROWSER_API_KEY` |
| [hyperscript](./hyperscript) | HyperScript | Plain-English task → TypeScript HyperAgent script + Live View. Uses Hyperbrowser’s managed HyperAgent API (no Anthropic key). | `HYPERBROWSER_API_KEY` |
| [assets-optimizer](./assets-optimizer) | Assets Optimizer | Pulls images, CSS, JS, and fonts from a site and optimizes them (AVIF, subset WOFF2, ZIP + report). | `HYPERBROWSER_API_KEY` |

### Content and media

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [hyperpages](./hyperpages) | HyperPages | Research a topic, generate a long-form page, attach images. Hosted share URLs use `pages.hyperbrowser.ai/p/[slug]`. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY`, `UNSPLASH_ACCESS_KEY` |
| [podcast-generator-ai](./podcast-generator-ai) | AI Podcast Generator | Site → script (OpenAI) → audio (ElevenLabs). Hyperbrowser key is entered in the UI. | `OPENAI_API_KEY`, `ELEVENLABS_API_KEY` + Hyperbrowser key in the sidebar |
| [hb-pitchdeck](./hb-pitchdeck) | Pitch Deck Generator | Company site → structured pitch deck (PDF + JSON), optional Slack delivery. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [Idea-generator-reddit](./Idea-generator-reddit) | Reddit Idea Generator | Finds pain points in Reddit threads and turns them into business ideas. Key is entered in the app. | Hyperbrowser key in the sidebar |

### Monitoring and UX

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [competitor-tracker](./competitor-tracker) | Competitor Tracker | Scheduled site monitoring with selector targeting, visual diffs, and optional Slack/Discord webhooks. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [churnhunter](./churnhunter) | ChurnHunter | **CLI** (not a web app). Walks a signup/demo flow and scores UX churn risk 0–100. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [hb-ui-bot-app](./hb-ui-bot-app) | UI Bot | Browser Use agent screenshots a site; OpenAI flags UI/UX issues by severity. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [phoenix-score](./phoenix-score) | PhoenixScore | Scores a draft or live tweet against published [x-algorithm](https://github.com/xai-org/x-algorithm) Phoenix weights. | `HYPERBROWSER_API_KEY`, `ANTHROPIC_API_KEY` |

### Sandboxes and visual builders

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [hyperview](./hyperview) | HyperView | OpenAI agent on a Hyperbrowser Sandbox with live terminal, file tree, browser, and shareable preview URL. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [hypervision](./hypervision) | HyperVision | Extracts semantic structure from a URL and renders it as an interactive force-directed graph. | `HYPERBROWSER_API_KEY` |
| [hyperbuild](./hyperbuild) | HyperBuild | Visual / natural-language agent builder (React Flow). Run live and export artifacts under `public/runs/`. | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |

### Hiring and jobs

| Directory | App | What it does | Typical keys |
| --- | --- | --- | --- |
| [deep-job-researcher](./deep-job-researcher) | Deep Job Researcher | Match a resume or portfolio to live postings (PDF upload, scoring, CSV/JSON export). | `HYPERBROWSER_API_KEY`, `OPENAI_API_KEY` |
| [hb-job-matcher](./hb-job-matcher) | HB Job Matcher | Extract skills from a portfolio, Google Doc/Drive resume, or PDF, then rank matching jobs. Hyperbrowser key is entered in the UI. | Optional `OPENAI_API_KEY` for richer matching |

## Running an example

### Standard Next.js app (45 of 46)

From the app directory:

```bash
npm install
npm run dev      # http://localhost:3000
```

Common scripts (present on nearly every app):

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

Env file names are **not consistent**. Check the app README and copy the template if one exists:

| Template filename | Used by (examples) |
| --- | --- |
| `.env.example` → `.env.local` | `agent-rank`, `hyperrank`, `o5-automation`, `hyperharness`, `hyperview`, … |
| `.env.local.example` → `.env.local` | `hyperscript` |
| `env.example` → `.env` or `.env.local` | `churnhunter`, `hyper-research` |
| `env.template` → `.env.local` | `web-to-agent` |
| `harness/.env.example` → `harness/.env` | `agent-web-index` |
| No committed template | Many apps. Create `.env.local` yourself with the keys listed in that README. |

### ChurnHunter (CLI)

```bash
cd churnhunter
npm install
cp env.example .env
npx ts-node churnhunter.ts --url https://example.com
# optional: --json
```

Exit codes: `0` low risk (&lt; 70), `1` high risk (≥ 70), `2` error.

### Hyperplex (app + worker + databases)

```bash
cd hyperplex
cp .env.example .env
npm install
docker compose up -d          # Redis + Postgres
npx prisma db push
npm run dev                   # Next.js :3000
npm run worker:dev            # background jobs (second terminal)
```

### Agent Web Index (app + harness)

```bash
cd agent-web-index
npm install
cd harness && cp .env.example .env && npm install && cd ..
npm run dev
```

Optional CLI:

```bash
cd agent-web-index/harness
npm run bench:one -- --task=hacker-news-thread
```

Supported task sites are listed in that README (Hacker News, MDN, books.toscrape.com).

### Apps that take the Hyperbrowser key in the UI

These do not require `HYPERBROWSER_API_KEY` in `.env` for a local demo (the key is stored in the browser, typically `localStorage`):

- [designmd-url](./designmd-url)
- [Idea-generator-reddit](./Idea-generator-reddit)
- [hb-job-matcher](./hb-job-matcher)
- [podcast-generator-ai](./podcast-generator-ai) (Hyperbrowser key in the sidebar; OpenAI and ElevenLabs stay on the server)
- [hyper-research](./hyper-research) (Settings UI; can also use env)

Treat a key in the browser as a **local-dev convenience**. Do not ship a public deployment that expects users to paste a secret into `localStorage` unless you have thought through exposure and quota.

### o5-automation preflight

```bash
cd o5-automation
cp .env.example .env.local
npm install
npm run preflight
npm run dev
```

## Environment variables

Almost every server-side app reads:

```bash
HYPERBROWSER_API_KEY=          # https://app.hyperbrowser.ai/quickstart
```

Common second keys:

| Variable | Used for | Example apps |
| --- | --- | --- |
| `OPENAI_API_KEY` | GPT models, embeddings, Whisper, agent loops | Most research, skill, and sandbox apps |
| `ANTHROPIC_API_KEY` | Claude, Computer Use, DESIGN.md / briefs | `agent-rank`, `hyperdesign`, `hyperfetch`, `hyperrank`, `phoenix-score`, `o5-automation` |
| `SERPER_API_KEY` | Google-style web search for source discovery | `skills-generator`, `hyperskills`, `hypergraph` |
| `MOONSHOT_API_KEY` | Kimi K3 | `browserswarm` |
| `TOGETHER_API_KEY` | Tool codegen | `web-to-agent` |
| `GOOGLE_API_KEY` | Gemini (as one of several LLM backends) | `hyperplex` |
| `ELEVENLABS_API_KEY` | TTS | `podcast-generator-ai` |
| `UNSPLASH_ACCESS_KEY` | Stock images | `hyperpages` |
| `GLM_API_KEY` / `GLM_BASE_URL` / `GLM_MODEL` | GLM-5.2 via Z.ai | `agent-web-index/harness` |
| `SLACK_WEBHOOK_URL` | Notifications | `competitor-tracker`, `hb-pitchdeck`, `yc-research-bot` |
| `DISCORD_WEBHOOK_URL` | Notifications | `competitor-tracker` |
| `DATABASE_URL` / `REDIS_URL` | Persistence and queues | `hyperplex` only |

App-specific tunables (concurrency, token budgets, models, sandbox image) live in each README. Do not commit `.env`, `.env.local`, or real keys. Root `.gitignore` already ignores `.env*`.

## Hyperbrowser capabilities these apps use

| Pattern | What to look at |
| --- | --- |
| `client.scrape.startAndWait` / scrape worker pools | [browserswarm](./browserswarm), [hyperplex](./hyperplex) |
| `web.fetch` with branding format | [designmd-url](./designmd-url) |
| Sessions + CDP (Playwright / Puppeteer) | [agent-web-index/harness](./agent-web-index), [deep-crawler-bot](./deep-crawler-bot), [scrape-to-api](./scrape-to-api) |
| Live View iframes | [hyperscript](./hyperscript), [agent-rank](./agent-rank), [browserswarm](./browserswarm) |
| Managed HyperAgent task API | [hyperscript](./hyperscript) |
| Computer Use / Browser Use | [agent-rank](./agent-rank), [o5-automation](./o5-automation), [hyperswarm](./hyperswarm) |
| Sandbox (`run_command`, `write_file`, `expose_port`) | [hyperview](./hyperview), [hyperharness](./hyperharness) |
| Persistent volume | [browserbrain](./browserbrain) |
| Stealth / proxy | [deep-reddit-researcher](./deep-reddit-researcher), [flow-mapper](./flow-mapper), [phoenix-score](./phoenix-score) |

Node SDK overview: [docs/sdks/node](https://www.hyperbrowser.ai/docs/sdks/node). Session quickstart: [docs/quickstart](https://www.hyperbrowser.ai/docs/quickstart).

## Repository layout

```
hyperbrowser-app-examples/
├── README.md                 # this file
├── LICENSE                   # MIT
├── .gitignore
├── agent-map/                # each folder is a standalone app
├── agent-rank/
├── …
└── yc-research-bot/
```

There is no workspace, no shared `node_modules`, and no root build. Copy a single directory out of the repo if you want a smaller project.

A few apps also include `AGENTS.md` / `CLAUDE.md` (Next.js 16 agent rules). Those are for coding agents working *inside* that app, not product docs.

`skills-generator` and `hyperskills` are related: same HyperSkill idea; `hyperskills` is the later edition (batch, vision, auto-mode).

## Deployment

Most apps are standard Next.js and can deploy to [Vercel](https://vercel.com) or any Node host:

1. Set the app directory as the project root (or root directory in Vercel).
2. Add the same environment variables you used locally.
3. Build command: `npm run build`. Output: Next.js default.

Watch for:

- **Server-only secrets.** Never prefix `HYPERBROWSER_API_KEY` with `NEXT_PUBLIC_` unless the app is explicitly a bring-your-own-key demo.
- **Long-running browser jobs.** Scrapes, Computer Use, and swarms often exceed serverless timeouts. Prefer a Node server, a worker ([hyperplex](./hyperplex)), or Hyperbrowser’s async APIs.
- **Cost.** Parallel browsers and large-context models add up. Apps such as Browserswarm document this in their README.
- **Local disk.** `hyperbuild`, `sora-research`, and similar write under `public/runs/` — that is not durable on ephemeral hosts.
- **Extra processes.** Hyperplex needs `docker compose` plus `npm run worker:dev` (or an equivalent production worker).
- **Native tools.** `sora-research` and `assets-optimizer` expect FFmpeg on the machine.

## Contributing

New examples and fixes are welcome.

1. Fork the repository and create a branch.
2. Put a new example in its **own top-level directory** with a `package.json` and a README that covers:
   - What the app does (one paragraph)
   - Required and optional environment variables
   - Install and run commands
   - What Hyperbrowser APIs it uses
3. Do not add a root workspace or cross-app dependencies.
4. Do not commit `.env*`, API keys, or scrape output that contains personal data.
5. Open a pull request against `main`.

When you change an existing app, keep that app’s README in sync (especially env var names).

## Support

| Resource | URL |
| --- | --- |
| Hyperbrowser product | [hyperbrowser.ai](https://hyperbrowser.ai) |
| Documentation | [hyperbrowser.ai/docs](https://www.hyperbrowser.ai/docs) |
| Dashboard / API keys | [app.hyperbrowser.ai](https://app.hyperbrowser.ai/quickstart) |
| Node SDK | [github.com/hyperbrowserai/node-sdk](https://github.com/hyperbrowserai/node-sdk) |
| Issues for these examples | [github.com/hyperbrowserai/hyperbrowser-app-examples/issues](https://github.com/hyperbrowserai/hyperbrowser-app-examples/issues) |
| Updates | [@hyperbrowser](https://x.com/hyperbrowser) |

File example-specific bugs on this repo and include the directory name, Node version, and a redacted env list (key *names* only).

## License

This repository is licensed under the [MIT License](./LICENSE).

A few apps also ship their own MIT `LICENSE` file (`hyperbuild`, `hyperrank`, `hypervision`). Those match this license.

## Related projects

- [Hyperbrowser Node SDK](https://github.com/hyperbrowserai/node-sdk)
- [Hyperbrowser docs](https://www.hyperbrowser.ai/docs)
- [Google DESIGN.md spec](https://github.com/google-labs-code/design.md) (used by DESIGNMD / HyperDesign)

---

Built with [Hyperbrowser](https://hyperbrowser.ai).
