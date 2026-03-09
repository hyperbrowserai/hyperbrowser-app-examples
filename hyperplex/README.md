**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# Hyperplex

Open-source AI research engine. Give it a goal — it decomposes it into subtasks, dispatches parallel subagents across frontier models (Claude, GPT, Gemini), scrapes the web via Hyperbrowser, and synthesizes a cited answer in real time.

## Quick Start

### 1. Get your API keys

- **Hyperbrowser** — [hyperbrowser.ai](https://hyperbrowser.ai)
- **LLM provider** — at least one of: Anthropic, OpenAI, or Google

### 2. Set up environment

```bash
cp .env.example .env
```

```
HYPERBROWSER_API_KEY=your_key
DATABASE_URL=file:./dev.db
REDIS_URL=redis://localhost:6379

# At least one LLM key
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
```

### 3. Install and run

```bash
npm install
docker compose up -d          # Redis + Postgres
npx prisma db push            # init DB
npm run dev                   # Next.js on :3000
npm run worker:dev            # background job worker
```

## Architecture

```
Next.js UI → API routes → BullMQ queue → Worker
                                           ├─ decomposeGoal (LLM planner)
                                           ├─ N parallel subagents
                                           │   ├─ webSearch (Hyperbrowser)
                                           │   ├─ fetchPage (Hyperbrowser)
                                           │   └─ synthesize (assigned model)
                                           └─ final synthesizeStream → SSE to client
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run worker:dev` | Start background worker (hot-reload) |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run tests |

---

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.
