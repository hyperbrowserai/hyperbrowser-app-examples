# HyperGrowth

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

HyperGrowth is a developer-GTM intelligence app that mines public developer communities for pain signals, clusters them into themes, and turns them into concrete growth plays: content angles, outbound snippets, community engagement opportunities, and landing-page messaging.

## Why This Example Exists

Growth teams at developer-tool companies need to find where demand is already leaking out into the open: GitHub issues, Hacker News threads, Reddit discussions, and other community surfaces. HyperGrowth demonstrates how Hyperbrowser can turn that messy public web signal into structured growth experiments.

## Current Foundation

- Next.js App Router, TypeScript, Tailwind CSS
- Hyperbrowser SDK integration for live public-page fetching
- OpenAI-powered synthesis when `OPENAI_API_KEY` is available
- Heuristic synthesis and demo data fallback for local exploration without keys
- Source adapters for Hacker News, GitHub Issues, and Reddit
- Typed request/response models for pain signals, clusters, and growth plays

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp env.example .env.local
```

3. Add your keys:

```env
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key
OPENAI_API_KEY=your_openai_api_key
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. Enter a developer-market pain or topic, such as `Playwright captcha failures`.
2. Select public sources: Hacker News, GitHub Issues, and Reddit.
3. Hyperbrowser fetches source search pages and extracts relevant text snippets.
4. HyperGrowth normalizes snippets into `PainSignal` records.
5. OpenAI clusters the evidence into pain themes and growth plays. If no OpenAI key is configured, a deterministic heuristic synthesizer is used.
6. The UI presents evidence quotes, clusters, content angles, and outbound drafts.

## Growth Use Case

Use HyperGrowth to discover high-intent developer frustration before it becomes a formal buying process. A growth engineer can mine recurring pain around browser automation, anti-bot failures, scraping reliability, and AI web agents, then convert those signals into:

- technical content ideas
- outbound messaging
- landing-page copy tests
- community engagement targets
- competitor-positioning insights

## API

### `POST /api/mine`

Request:

```json
{
  "query": "Playwright captcha failures",
  "sources": ["hackernews", "github", "reddit"],
  "maxResults": 12
}
```

Response:

```ts
type MineResult = {
  query: string;
  generatedAt: string;
  mode: "demo" | "live";
  signals: PainSignal[];
  clusters: PainCluster[];
  growthPlays: GrowthPlay[];
  outboundDrafts: string[];
  contentAngles: string[];
};
```

## Next Steps

- Add streaming progress updates for source fetch, extraction, and synthesis.
- Improve source-specific parsers for cleaner titles, authors, timestamps, and engagement.
- Add export to JSON, CSV, and Markdown.
- Add a polished dashboard UI and responsive visual system.
