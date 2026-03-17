**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# HyperGraph

Turn any technical topic into a traversable skill graph your agent can navigate. This is the difference between an agent that follows instructions and one that understands a domain.

HyperGraph scrapes real sources with Hyperbrowser, then uses Claude to generate a network of interconnected markdown nodes — each one a complete thought, linked with wikilinks the agent can follow.

```
Search → Hyperbrowser scrape → Claude graph generation → Interactive force graph
```

## What it generates

- **MOC** — Map of Content; the entry point your agent reads first
- **Concepts** — foundational ideas, theories, and frameworks
- **Patterns** — reusable techniques and approaches
- **Gotchas** — failure modes and counterintuitive findings

Every node has a YAML `description` the agent can scan without reading the full file. Wikilinks are woven into prose so the agent knows *why* to follow them.

## Get an API key

Get your Hyperbrowser API key at [https://hyperbrowser.ai](https://hyperbrowser.ai)

## Quick start

```bash
git clone https://github.com/yourusername/hypergraph
cd hypergraph
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter any technical topic.

## Environment variables

```bash
HYPERBROWSER_API_KEY=          # from hyperbrowser.ai
SERPER_API_KEY=                # from serper.dev — used to find source URLs
ANTHROPIC_API_KEY=             # used for graph generation with Claude Haiku 4.5
HYPERBROWSER_MAX_CONCURRENCY=1 # free plan: keep at 1. paid plans can increase this.
```

## Free plan & concurrency

The free Hyperbrowser plan supports **1 concurrent browser session**. By default the app scrapes URLs **sequentially** (one at a time), so it works out of the box on any plan.

If you hit a concurrency limit the app will show an amber warning banner with an **Upgrade plan** link rather than crashing silently. To unlock parallel scraping, upgrade at [hyperbrowser.ai](https://hyperbrowser.ai) and set `HYPERBROWSER_MAX_CONCURRENCY` to match your plan's limit.

## Stack

- **Next.js 16** — App Router, API routes
- **Hyperbrowser** — scrapes source material with `onlyMainContent` for clean output
- **Claude Haiku 4.5** — generates the skill graph JSON from scraped docs
- **Serper** — Google search to find the best source URLs for any topic
- **react-force-graph-2d** — force-directed graph canvas rendering
- **react-markdown** — renders node content in the VS Code-style preview panel

## Download

Every generated graph can be downloaded as a `.zip` containing ready-to-use markdown files. Drop the folder into `.claude/skills/` or `.cursor/skills/` and point your agent at `moc.md` as the entry point.

---

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.
