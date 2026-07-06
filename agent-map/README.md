**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# Agent Map

Agent Map crawls a website with Hyperbrowser and turns it into an agent-ready artifact: page nodes, link flows, crawl status, and AI-extracted page summaries.

It runs locally in Next.js. Your Hyperbrowser API key stays server-side in local API routes and never reaches the browser.

## Get an API key

Create a key at https://hyperbrowser.ai.

## Quick Start

```bash
git clone <repo-url>
cd agent-map
npm install
cp .env.example .env.local
npm run dev
```

Set `.env.local`:

```bash
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key
```

Open [http://localhost:3000](http://localhost:3000), enter a URL, and run a real crawl.

## What It Does

- Shows a live crawl feed of visited pages.
- Builds a monochrome sitemap graph from real crawled links.
- Extracts per-page purpose, key actions, and primary data.
- Outputs JSON and markdown with copy/download buttons.

## Growth Use Case

Use it to turn a target site into reusable context for growth agents, so they can understand landing pages, content hubs, and conversion paths without re-crawling.

Follow @hyperbrowser for updates.
