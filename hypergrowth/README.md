# HyperGrowth

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

HyperGrowth is a developer-GTM intelligence app that mines public developer communities for pain signals, clusters them into themes, and turns them into concrete growth plays: content angles, outbound snippets, community engagement opportunities, and landing-page messaging.

## Why This Example Exists

Growth teams at developer-tool companies need to find where demand is already leaking out into the open: GitHub issues, Hacker News threads, Reddit discussions, and open-web posts. HyperGrowth demonstrates how Hyperbrowser can turn that messy public web signal into structured growth experiments.

## Current Foundation

- Next.js App Router, TypeScript, Tailwind CSS
- Hyperbrowser SDK integration for broad web discovery and URL enrichment
- Source adapters for Hacker News Algolia, GitHub Issues API, and Hyperbrowser Search
- Configurable subreddit targeting through Hyperbrowser open-web search, without requiring direct Reddit API credentials
- Evidence-candidate quality gate that rejects login pages, block walls, empty results, and navigation chrome before scoring
- Typed request/response models for raw signals, normalized evidence, scores, clusters, growth plays, and growth briefs
- Deterministic signal scoring for relevance, pain intensity, commercial intent, Hyperbrowser fit, recency, source reliability, and confidence
- Jaccard-based dedupe to compress repeated evidence before clustering
- Cluster strength scoring using frequency, source diversity, pain intensity, and Hyperbrowser fit
- Expected-value scoring for growth plays across content, outbound, community, and landing-page channels
- Source-aware query planning with deterministic fallback and optional LLM expansion
- Optional LLM judgment on a bounded batch of high-score and borderline signals
- Dimension-specific score fusion between deterministic scores and contextual LLM judgment
- Generic OpenAI-compatible provider support for OpenRouter, NVIDIA NIM-style endpoints, OpenAI, or local-compatible gateways
- Heuristic synthesis and deterministic demo data for local exploration without keys

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

# Optional source-native connectors
GITHUB_TOKEN=your_github_token

# Optional generic OpenAI-compatible provider
LLM_PROVIDER=openrouter
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your_provider_key
LLM_MODEL=your_model
LLM_SITE_URL=http://localhost:3000
LLM_APP_NAME=HyperGrowth

# Optional OpenAI fallback when LLM_API_KEY is not set
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini

# Optional safety clamp
LLM_MAX_CALLS_PER_RUN=2
LLM_TIMEOUT_MS=12000
HYPERBROWSER_TIMEOUT_MS=12000
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. Enter a developer-market pain or topic, such as `Playwright captcha failures`.
2. Select public sources: Hacker News, GitHub Issues, and open web via Hyperbrowser.
3. HyperGrowth runs a bounded autonomous research loop. In lean, balanced, or full mode, an LLM can plan source-specific searches; otherwise a deterministic source-aware planner is used.
4. Source adapters collect `EvidenceCandidate` records instead of final signals:
   - GitHub uses the Issues API, optionally with `GITHUB_TOKEN`, and enriches issue bodies plus a small comment sample.
   - Hacker News uses only the Algolia API for stories and comments. Queries are kept terse because Algolia performs better on keyword searches such as `playwright captcha` than on long natural-language prompts.
   - Hyperbrowser Search discovers broad open-web results across blogs, docs, workaround posts, and pages without clean APIs.
   - Reddit is not a direct source. Configured subreddits become `site:reddit.com/r/...` Hyperbrowser Search targets, and only canonical thread URLs are eligible for Fetch.
5. A deterministic evidence-quality gate rejects login pages, block walls, empty-result pages, navigation chrome, thin snippets, and weak query-overlap candidates before scoring.
6. The research critic chooses which Hyperbrowser Search results are worth fetching. In LLM-enabled modes this is contextual; otherwise it falls back to deterministic URL/snippet guards.
7. Hyperbrowser Fetch enriches selected canonical URLs, especially open-web results returned by Hyperbrowser Search.
   Reddit permalinks use Hyperbrowser stealth mode and are rejected if Fetch returns a login, search, landing, or block page.
8. The evidence judge runs after Fetch, not before it. It accepts only grounded developer-authored pain, workaround, failure, bug, or buying/infra evidence. Block walls, search UI, cookie banners, generic marketing pages, and platform access failures are never promoted to signals.
9. LLM-enabled modes can use contextual evidence judgment to choose quotes from fetched markdown and structured API results. The fallback extractor remains deterministic, and structured GitHub/HN evidence can still survive if the LLM drops it.
10. HyperGrowth normalizes extracted raw evidence into `PainSignal` records with source URL, canonical URL, quote, author, timestamp, engagement, evidence kind, repository, matched terms, tools mentioned, category, and urgency.
11. The scoring engine assigns deterministic scores for relevance, pain intensity, commercial intent, Hyperbrowser fit, recency, source reliability, confidence, and total signal value.
12. The dedupe engine compresses near-duplicate evidence using Jaccard similarity.
13. Balanced and full modes send a small mixed batch to the LLM for contextual judgment. Invalid output gets one repair attempt, then deterministic fallback.
14. Score fusion combines heuristic dimensions with LLM dimensions while keeping recency and source reliability deterministic.
15. The clustering engine groups evidence by pain category and calculates cluster strength using frequency, source diversity, average pain intensity, and Hyperbrowser fit.
16. The growth-play engine ranks actions by expected value, balancing commercial value, evidence strength, channel fit, confidence, and execution cost.
17. Full mode can optionally refine cluster and play language, but every claim must cite existing signal IDs. If synthesis fails, deterministic synthesis is used.
18. The API returns a growth brief plus UI-compatible fields for evidence quotes, clusters, content angles, outbound drafts, diagnostics, and LLM usage metadata.

## Signal Pipeline

HyperGrowth treats growth research as an evidence-to-action pipeline:

```txt
user query
-> bounded autonomous research plan
-> source-native API collectors plus Hyperbrowser Search
-> evidence candidates
-> pre-fetch quality gate
-> optional LLM search-result critic
-> Hyperbrowser Fetch enrichment for selected URLs
-> post-fetch evidence judge
-> normalized pain signals
-> deterministic signal scores
-> deduped evidence groups
-> optional LLM judgment batch
-> fused scores and refined categories
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

## Analysis Modes

The API accepts `analysisMode`:

- `deterministic`: no LLM calls; static query planning, deterministic scoring, clustering, and synthesis.
- `lean`: one LLM phase for source-routed query expansion.
- `balanced`: query expansion plus LLM judgment and score fusion. This is the default.
- `full`: query expansion, LLM judgment, and grounded synthesis.

If no LLM provider is configured, live runs automatically downgrade to `live-deterministic`. The server can also clamp usage with `LLM_MAX_CALLS_PER_RUN`. Demo mode is always deterministic because it uses fixed sample evidence.

LLM and Hyperbrowser requests are explicitly timeout-bounded. Transport failures skip the repair attempt and fall back immediately because retrying a timeout does not fix malformed JSON.

## LLM Contextual Judgment

Hardcoded dictionaries are useful for stability, but they miss contextual signals. For example, a post saying "three people babysit this crawler every morning" may imply strong commercial pain without mentioning `captcha`, `proxy`, or `blocked`.

HyperGrowth uses a hybrid model:

```txt
heuristics = cheap, stable, explainable first-pass detector
LLM = contextual judge and growth translator
```

The LLM only sees a bounded mixed batch:

- top 12 high-score signals
- top 6 borderline signals
- up to 2 source-diversity fillers

The LLM judgment returns strict JSON:

```ts
type LLMJudgment = {
  signalId: string;
  isActionable: boolean;
  contextualRelevance: number;
  impliedPainIntensity: number;
  impliedCommercialIntent: number;
  hyperbrowserFit: number;
  confidence: number;
  category: PainCategory;
  representativeQuote: string;
  reasoning: string[];
};
```

Score fusion combines both systems instead of trusting either blindly. Heuristics stay in charge of mechanical facts like recency, source reliability, engagement, and dedupe. The LLM helps with implied pain, contextual relevance, category refinement, quote quality, and growth-channel routing.

Fusion policy:

```txt
relevance = max(heuristic.relevance, 0.90 * llm.contextualRelevance)
painIntensity = 0.45 * heuristic + 0.55 * llm.impliedPainIntensity
commercialIntent = 0.35 * heuristic + 0.65 * llm.impliedCommercialIntent
hyperbrowserFit = 0.45 * heuristic + 0.55 * llm.hyperbrowserFit
confidence = 0.60 * heuristic + 0.40 * llm.confidence
```

Non-actionable LLM judgments are capped below the normal ranking threshold instead of being silently promoted.

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
  "sources": ["hackernews", "github", "hyperbrowser"],
  "maxResults": 12,
  "analysisMode": "balanced",
  "openWebTargets": {
    "includeBroadWeb": true,
    "redditSubreddits": ["webscraping", "playwright", "automation"]
  }
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
  llmJudgments?: LLMJudgment[];
  brief?: GrowthBrief;
  metadata: MineMetadata;
};
```

Live runs do not substitute demo data when no evidence is found. Empty live results return `mode: "live"`, empty arrays, a low-confidence brief, executed-search diagnostics, and notes explaining what happened.

`metadata.timings` reports phase durations for query planning, source collection, evidence preparation, normalization, pipeline work, and total request time. `metadata.searchDiagnostics` reports each executed source search with status, duration, raw candidate count, and any source-level errors.

## Verification

```bash
npm run lint
npm run build
npm test
```

## Next Steps

- Add streaming progress updates for source fetch, extraction, and synthesis.
- Add UI controls for provider/source credential diagnostics and local run history.
- Add export to JSON and Markdown.
- Add a polished dashboard UI and responsive visual system.
