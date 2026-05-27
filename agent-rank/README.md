# AGENTRANK

Is your website ready for AI agents?

AgentRank runs three real AI browser agents (Claude Computer Use, OpenAI CUA, and Gemini Computer Use) on your site in parallel and scores how agent-operable it is. All three agents run inside Hyperbrowser sessions, side by side, in a live grid.

## How it works

1. Paste a URL and a task.
2. The backend creates three Hyperbrowser sessions in parallel and returns the live view URLs immediately.
3. The frontend embeds each live session in a side-by-side iframe grid.
4. All three agents run the same task at once.
5. When every agent has finished, Claude Sonnet 4 judges the results and produces a 0-100 operability score, an agent breakdown, a list of issues, and recommended fixes.

## The score

- 90-100. All three agents completed the task.
- 60-89. Two agents completed.
- 30-59. One agent completed.
- 0-29. No agents completed.

## Setup

```bash
git clone <this repo>
cd agent-rank
npm install
cp .env.example .env.local
# add HYPERBROWSER_API_KEY and ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Environment

```
HYPERBROWSER_API_KEY=
ANTHROPIC_API_KEY=
```

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Framer Motion
- `@hyperbrowser/sdk` for every browser agent
- `@anthropic-ai/sdk` (Claude Sonnet 4) as the judge

Built with [Hyperbrowser](https://hyperbrowser.ai).
