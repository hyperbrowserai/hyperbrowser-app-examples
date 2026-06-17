# HYPERVIEW

**Watch an agent work on a real computer. Live UI, not a wall of markdown.**

Give it a task. An agent spins up a [Hyperbrowser Sandbox](https://hyperbrowser.ai) — a real cloud computer — and does the work on it: writes files, runs commands, and (when the task needs it) browses the live web. Instead of dumping markdown, HyperView renders the agent's progress as live UI panels: a streaming terminal, a file tree with contents, a browser view, and a live iframe of whatever it builds. When the agent ships something runnable, the sandbox exposes a port and you get a real, shareable live URL.

## What it does

- Type a task ("build a snake game and run it", "scrape Hacker News and build a comparison page").
- A sandbox boots in **sub-50ms** — the measured boot time is shown front and center.
- The agent loop (OpenAI) writes files and runs commands on the sandbox while you watch.
- Output streams over Server-Sent Events into a multi-panel workspace.
- When a server starts, the agent exposes its port and a live URL renders in an iframe — shareable in one click.

## Hyperbrowser Sandbox features on screen

- **Sub-50ms startup** — the boot time is measured and counts up in the status bar.
- **Terminal access** — `run_command` streams stdout/stderr live.
- **Filesystem API** — `write_file` writes real files, shown in the file tree.
- **Port exposure (live URLs)** — `expose_port` returns a public URL rendered live.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion
- [`@hyperbrowser/sdk`](https://hyperbrowser.ai) for **all** sandbox operations and web fetch
- [`openai`](https://www.npmjs.com/package/openai) for the agent loop (`gpt-5.4-mini`)

## Setup

```bash
git clone <repo>
cd hyperview
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Environment variables

```
HYPERBROWSER_API_KEY=your_key
OPENAI_API_KEY=your_key
# optional
OPENAI_MODEL=gpt-5.4-mini
SANDBOX_IMAGE=node
```

## How it works

- **`POST /api/run`** creates a sandbox, generates a `runId`, starts the agent loop in the background, and returns immediately.
- **`GET /api/run/[id]/stream`** is a Server-Sent Events endpoint that streams `terminal`, `file`, `browser`, `preview`, `done`, and `error` events to the frontend as they happen.
- The agent has a small fixed toolset — `write_file`, `run_command`, `browse`, `expose_port`, `done` — and each tool call maps to a UI panel. The loop runs up to 25 steps.
- The sandbox is always stopped on `done` or `error`.

---

Built with [Hyperbrowser Sandboxes](https://hyperbrowser.ai).
