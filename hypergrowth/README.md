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
- Full-mode LLM judgment over every deduped signal in bounded batches
- LLM-authoritative contextual scoring with deterministic recency, reliability, and fallback
- Generic OpenAI-compatible provider support for OpenRouter, NVIDIA NIM-style endpoints, OpenAI, or local-compatible gateways
- Hyperbrowser Fetch artifacts including markdown, links, screenshot, page-summary JSON, and branding metadata when available
- Page triage and research feedback that reject weak fetched pages and feed better follow-up searches into later waves
- Streaming run trace for planning, discovery, fetch selection, page triage, evidence judgment, scoring, and synthesis
- Diagnostics panels for source coverage, Hyperbrowser fetch artifacts, quality flow, LLM status, and final evidence
- Heuristic synthesis and deterministic demo data for local exploration without keys

## Project Structure

```txt
app/
  api/mine/route.ts          non-streaming mining endpoint
  api/mine/stream/route.ts   server-sent-events mining endpoint
  page.tsx                   dashboard shell and run controls
components/
  ResultsDashboard.tsx       metrics, trace, evidence, diagnostics, and brief UI
  SourceIcon.tsx             source icon rendering
  SourceSelector.tsx         HN/GitHub enrichment source selector
lib/
  mine-runner.ts             API orchestration and response assembly
  research/                  autonomous research loop, planning, fetch/page triage, feedback, evidence judgment
  llm/                       provider config, JSON repair, evidence/scoring/synthesis prompts
  sources/                   HN, GitHub, and Hyperbrowser search adapters
  hyperbrowser.ts            Hyperbrowser Search/Fetch integration and artifact parsing
  pipeline.ts                normalize -> score -> dedupe -> LLM judgment -> cluster -> synthesize
  scoring.ts                 deterministic score model
  score-fusion.ts            LLM/deterministic score fusion
  __tests__/                 focused Vitest coverage for pipeline, research, providers, and sources
```

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
HYPERBROWSER_TIMEOUT_MS=12000
HYPERBROWSER_SESSION_RETRY_DELAYS_MS=1500,3000,6000,12000

# Optional source-native connectors
GITHUB_TOKEN=your_github_token

# Optional generic OpenAI-compatible provider
LLM_PROVIDER=openrouter
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your_provider_key
LLM_MODEL=your_model
LLM_SITE_URL=http://localhost:3000
LLM_APP_NAME=HyperGrowth
ENABLE_REASONING=false
REASONING_LEVEL=medium

# Optional OpenAI fallback when LLM_API_KEY is not set
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini

# Optional safety clamp
LLM_MAX_CALLS_PER_RUN=12
LLM_TIMEOUT_MS=12000
```

Reasoning effort is optional for OpenAI-compatible Chat Completions calls. `REASONING_LEVEL` is only read when `ENABLE_REASONING=true`; allowed values are `low`, `medium`, and `high`, with invalid or missing values defaulting to `medium`.

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. Enter a developer-market pain or topic, such as `Playwright captcha failures`.
2. Select enrichment sources: Hacker News and GitHub Issues. Hyperbrowser is always used as the discovery and page-reading layer for live runs.
3. HyperGrowth runs a bounded autonomous research loop. In full mode, an LLM can plan Hyperbrowser-first searches; otherwise a deterministic source-aware planner is used.
4. Source adapters collect `EvidenceCandidate` records instead of final signals:
   - Hyperbrowser Search runs first and discovers broad open-web results across blogs, docs, workaround posts, forums, Reddit permalinks, HN pages, GitHub pages, and pages without clean APIs.
   - Hyperbrowser Fetch reads selected discovery results, returning markdown and links for downstream evidence judgment and enrichment planning.
   - GitHub uses the Issues API, optionally with `GITHUB_TOKEN`, after Hyperbrowser discovery/fetch to corroborate discovered pain with issue bodies plus a small comment sample.
   - Hacker News uses only the Algolia API for stories and comments after Hyperbrowser discovery/fetch. Queries are kept terse because Algolia performs better on keyword searches such as `playwright captcha` than on long natural-language prompts.
   - Reddit is not a direct source. Configured subreddits become `site:reddit.com/r/...` Hyperbrowser Search targets, and only canonical thread URLs are eligible for Fetch.
5. A deterministic evidence-quality gate hard-rejects login pages, block walls, empty-result pages, and navigation chrome. Softer concerns like thin snippets, weak query overlap, or promotional language are carried forward as quality flags for the evidence judge instead of being silently deleted.
6. The research critic chooses which Hyperbrowser Search results are worth fetching. In LLM-enabled modes this is contextual; otherwise it falls back to deterministic URL/snippet guards.
7. Hyperbrowser Fetch enriches selected canonical URLs and exposes markdown, outbound links, screenshots, page-summary JSON, and branding metadata when available. HN/GitHub API enrichment runs only after this browser-discovered path.
   Reddit permalinks use Hyperbrowser stealth mode and are rejected if Fetch returns a login, search, landing, or block page.
8. Fetched pages go through page triage. The triage step can accept, reject, or request more context, and rejected pages can feed follow-up-search suggestions into the next research wave.
9. The evidence judge runs after Fetch and page triage, not before them. It accepts only grounded developer-authored pain, workaround, failure, bug, or buying/infra evidence. Block walls, search UI, cookie banners, generic marketing pages, and platform access failures are never promoted to signals.
10. LLM-enabled modes can use contextual evidence judgment to choose quotes from fetched markdown and structured API results. The fallback extractor remains deterministic, and structured GitHub/HN evidence can still survive if the LLM drops it.
11. If evidence is thin, source coverage is incomplete, or selected sources have not contributed enough signal, full LLM-enabled research can run a gap-expansion pass that proposes a second wave of searches. This is reported through `gapExpansionMode`.
12. HyperGrowth normalizes extracted raw evidence into `PainSignal` records with source URL, canonical URL, quote, author, timestamp, engagement, evidence kind, repository, matched terms, tools mentioned, category, and urgency.
13. The scoring engine assigns deterministic scores for relevance, pain intensity, commercial intent, Hyperbrowser fit, recency, source reliability, confidence, and total signal value.
14. The dedupe engine compresses near-duplicate evidence using Jaccard similarity.
15. Full mode sends every deduped signal to the LLM for contextual judgment in bounded batches. Invalid output gets one repair attempt, then deterministic fallback for the failed batch.
16. Full-mode scoring uses LLM-authored relevance, pain, commercial intent, Hyperbrowser fit, and confidence while keeping recency and source reliability deterministic.
17. The clustering engine groups evidence by pain category and calculates cluster strength using frequency, source diversity, average pain intensity, and Hyperbrowser fit.
18. The growth-play engine ranks actions by expected value, balancing commercial value, evidence strength, channel fit, confidence, and execution cost.
19. Full mode can optionally refine cluster and play language, but every claim must cite existing signal IDs. If synthesis fails, deterministic synthesis is used.
20. The API returns a growth brief plus UI-compatible fields for evidence quotes, clusters, content angles, outbound drafts, diagnostics, Hyperbrowser artifacts, research feedback, and LLM usage metadata.

## Signal Pipeline

HyperGrowth treats growth research as an evidence-to-action pipeline:

```txt
user query
-> bounded autonomous research plan
-> Hyperbrowser Search discovery
-> discovered web candidates
-> pre-fetch quality gate
-> optional LLM search-result critic
-> Hyperbrowser Fetch enrichment for selected URLs
-> page triage using fetched artifacts
-> HN/GitHub API enrichment and corroboration
-> post-fetch evidence judge
-> page-triage feedback for follow-up searches
-> optional gap expansion and second research wave
-> normalized pain signals
-> deterministic signal scores
-> deduped evidence groups
-> full-mode LLM judgment batches
-> final scores and refined categories
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

In deterministic mode, this score is the final score. In full mode, it is passed to the LLM as diagnostic context and fallback material; the LLM becomes the final judge for contextual dimensions.

## Analysis Modes

The API accepts `analysisMode`:

- `deterministic`: no LLM calls; static query planning, deterministic scoring, clustering, and synthesis.
- `full`: LLM-assisted research, every deduped signal judged by the LLM in batches, gap expansion when needed, and grounded synthesis when call budget allows. This is the default.

If no LLM provider is configured, live runs automatically downgrade to `live-deterministic`. `LLM_MAX_CALLS_PER_RUN` is a safety cap for full mode; it does not silently create intermediate modes. Demo mode is always deterministic because it uses fixed sample evidence.

LLM and Hyperbrowser requests are explicitly timeout-bounded. Transport failures skip the repair attempt and fall back immediately because retrying a timeout does not fix malformed JSON.

## LLM Contextual Judgment

Hardcoded dictionaries are useful for stability, but they miss contextual signals. For example, a post saying "three people babysit this crawler every morning" may imply strong commercial pain without mentioning `captcha`, `proxy`, or `blocked`.

HyperGrowth uses a two-mode model:

```txt
deterministic = cheap, stable, explainable lexical scorer
full = LLM final judge plus deterministic fallback
```

In full mode, the LLM sees every deduped signal in bounded batches. Deterministic scores are included as diagnostic context, but lexical overlap no longer decides which signals are allowed to recover.

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

Full-mode scoring makes the LLM authoritative for contextual dimensions while heuristics stay in charge of mechanical facts like recency, source reliability, engagement, dedupe, and fallback.

Full-mode scoring policy:

```txt
relevance = llm.contextualRelevance
painIntensity = llm.impliedPainIntensity
commercialIntent = llm.impliedCommercialIntent
hyperbrowserFit = llm.hyperbrowserFit
confidence = llm.confidence
recency = deterministic recency
sourceReliability = deterministic source reliability
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
  "analysisMode": "full",
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

`metadata.hyperbrowserRun` reports Hyperbrowser-specific search and fetch traces, including output formats, markdown length, link count, rich-fetch fallback status, screenshots, page-summary JSON, branding metadata, page-triage decisions, and whether the fetched page contributed accepted evidence.

`metadata.researchFeedback` reports rejected fetched pages and follow-up search ideas generated from page triage. This is useful for understanding why later waves changed direction.

## Runtime Budgets

`maxResults` is the user-facing final evidence budget. It is accepted from `3` to `30`.

Hyperbrowser fetch capacity scales with the requested result budget so larger runs can gather enough page-level context. `LLM_MAX_CALLS_PER_RUN` separately controls LLM call budget for planning, fetch selection, page triage, evidence judgment, signal scoring, and synthesis. If the LLM budget is exhausted, remaining steps fall back to deterministic behavior where possible.

For public demos, start with `maxResults=6` or `12`. Higher values can issue more searches/fetches and take longer, especially when rich fetch artifacts are enabled.

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
npm test
```

## Next Steps

- Add UI controls for provider/source credential diagnostics and local run history.
- Add export to JSON and Markdown.
- Add saved queries and run comparison.
- Add an optional lower-cost mode for runs that should avoid rich fetch artifacts.
