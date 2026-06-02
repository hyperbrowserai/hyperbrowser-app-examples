# HyperGrowth

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

HyperGrowth is a developer-GTM intelligence app that mines public developer communities for pain signals, clusters them into themes, and turns them into concrete growth plays: content angles, outbound snippets, community engagement opportunities, and landing-page messaging.

## Why This Example Exists

Growth teams at developer-tool companies need to find where demand is already leaking out into the open: GitHub issues, Hacker News threads, Reddit discussions, and other community surfaces. HyperGrowth demonstrates how Hyperbrowser can turn that messy public web signal into structured growth experiments.

## Current Foundation

- Next.js App Router, TypeScript, Tailwind CSS
- Hyperbrowser SDK integration for live public-page fetching
- Source adapters for Hacker News, GitHub Issues, and Reddit
- Typed request/response models for raw signals, normalized evidence, scores, clusters, growth plays, and growth briefs
- Deterministic signal scoring for relevance, pain intensity, commercial intent, Hyperbrowser fit, recency, source reliability, and confidence
- Jaccard-based dedupe to compress repeated evidence before clustering
- Cluster strength scoring using frequency, source diversity, pain intensity, and Hyperbrowser fit
- Expected-value scoring for growth plays across content, outbound, community, and landing-page channels
- OpenAI-powered grounded synthesis when `OPENAI_API_KEY` is available
- Heuristic synthesis and demo data fallback for local exploration without keys

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
3. Source adapters collect raw evidence. Hacker News uses the Algolia API first, while other source pages are fetched with Hyperbrowser.
4. HyperGrowth normalizes raw evidence into `PainSignal` records with source URL, canonical URL, quote, author, timestamp, engagement, matched terms, tools mentioned, category, and urgency.
5. The scoring engine assigns deterministic scores for relevance, pain intensity, commercial intent, Hyperbrowser fit, recency, source reliability, confidence, and total signal value.
6. The dedupe engine compresses near-duplicate evidence using Jaccard similarity.
7. The clustering engine groups evidence by pain category and calculates cluster strength using frequency, source diversity, average pain intensity, and Hyperbrowser fit.
8. The growth-play engine ranks actions by expected value, balancing commercial value, evidence strength, channel fit, confidence, and execution cost.
9. OpenAI optionally refines cluster and play language, but every claim must cite existing signal IDs. If no OpenAI key is configured, deterministic synthesis is used.
10. The API returns a growth brief plus UI-compatible fields for evidence quotes, clusters, content angles, and outbound drafts.

## Signal Pipeline

HyperGrowth treats growth research as an evidence-to-action pipeline:

```txt
raw community evidence
-> normalized pain signals
-> deterministic signal scores
-> deduped evidence groups
-> pain clusters
-> expected-value-ranked growth plays
-> grounded growth brief
```

The current backend keeps the UI simple while doing most of the serious work behind the scenes. The important design constraint is that LLM output should interpret evidence, not invent it.

## Scoring Model

Each signal receives a `SignalScore`:

```ts
type SignalScore = {
  signalId: string;
  relevance: number;
  painIntensity: number;
  commercialIntent: number;
  hyperbrowserFit: number;
  recency: number;
  sourceReliability: number;
  confidence: number;
  total: number;
  reasons: string[];
};
```

The deterministic total score is weighted around:

```txt
total =
  0.22 * relevance +
  0.20 * painIntensity +
  0.18 * hyperbrowserFit +
  0.16 * commercialIntent +
  0.10 * recency +
  0.08 * sourceReliability +
  0.06 * confidence
```

This makes the system explainable and cheap to run. A GitHub issue about a production browser-session failure should score differently from a casual Reddit mention of scraping.

## LLM Contextual Scoring Direction

Hardcoded dictionaries are useful for stability, but they will miss contextual signals. For example, a post saying "three people babysit this crawler every morning" may imply strong commercial pain without mentioning `captcha`, `proxy`, or `blocked`.

The next intelligence layer should use a hybrid model:

```txt
heuristics = cheap, stable, explainable first-pass detector
LLM = contextual judge and growth translator
```

Planned flow:

```txt
collect raw evidence
-> heuristic filter and score
-> dedupe
-> LLM contextual judgment on top candidates
-> score fusion
-> cluster
-> rank growth plays
-> grounded synthesis with citations
```

The LLM judgment should return strict JSON:

```ts
type LLMJudgment = {
  signalId: string;
  contextualRelevance: number;
  impliedPainIntensity: number;
  impliedCommercialIntent: number;
  hyperbrowserFit: number;
  category: PainCategory;
  representativeQuote: string;
  reasoning: string[];
};
```

Score fusion should combine both systems instead of trusting either blindly. Heuristics stay in charge of mechanical facts like recency, source reliability, engagement, and dedupe. The LLM helps with implied pain, contextual relevance, category refinement, quote quality, and growth-channel routing.

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
  signalScores?: SignalScore[];
  dedupeGroups?: DedupeGroup[];
  brief?: GrowthBrief;
};
```

## Next Steps

- Add LLM contextual judgment and score fusion on top of the deterministic scoring layer.
- Add streaming progress updates for source fetch, extraction, and synthesis.
- Improve source-specific parsers for cleaner titles, authors, timestamps, and engagement.
- Add export to JSON, CSV, and Markdown.
- Add a polished dashboard UI and responsive visual system.
