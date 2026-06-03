import { buildGrowthBrief } from "./brief";
import type {
  AnalysisMode,
  MineResult,
  PainSignal,
  SignalScore,
} from "./types";
import type { AnalysisModeResolution } from "./analysis-mode";

const demoGeneratedAt = new Date().toISOString();

export const demoSignals: PainSignal[] = [
  {
    id: "demo-1",
    source: "hackernews",
    sourceUrl: "https://news.ycombinator.com/",
    canonicalUrl: "https://news.ycombinator.com/",
    title: "Playwright keeps getting blocked on production sites",
    url: "https://news.ycombinator.com/",
    quote:
      "The script works locally, then falls over once Cloudflare or a login wall gets involved.",
    extractedAt: demoGeneratedAt,
    matchedTerms: ["playwright", "captcha", "production", "blocked"],
    toolsMentioned: ["Playwright", "Cloudflare"],
    painCategory: "anti_bot_reliability",
    urgency: "high",
    engagement: 84,
    engagementDetails: { score: 52, comments: 32 },
    evidenceKind: "story",
    sourceReliabilityOverride: 0.76,
  },
  {
    id: "demo-2",
    source: "github",
    sourceUrl: "https://github.com/search?q=browser+session+scraping&type=issues",
    canonicalUrl: "https://github.com/search?q=browser+session+scraping&type=issues",
    title: "Browser sessions are hard to keep alive at scale",
    url: "https://github.com/search?q=browser+session+scraping&type=issues",
    quote:
      "We need persistent browser state across retries, but self-hosting the browser fleet is becoming the product.",
    extractedAt: demoGeneratedAt,
    matchedTerms: ["browser", "session", "retry", "scale"],
    toolsMentioned: ["Puppeteer", "browser sessions"],
    painCategory: "browser_infra_cost",
    urgency: "high",
    engagement: 31,
    engagementDetails: { reactions: 18, comments: 13 },
    evidenceKind: "issue",
    repo: "microsoft/playwright",
    ecosystemBoost: true,
    sourceReliabilityOverride: 0.86,
  },
  {
    id: "demo-3",
    source: "reddit",
    sourceUrl: "https://www.reddit.com/search/?q=javascript%20scraping%20blocked",
    canonicalUrl: "https://www.reddit.com/search/?q=javascript%20scraping%20blocked",
    title: "Scraping JavaScript-heavy pages is brittle",
    url: "https://www.reddit.com/search/?q=javascript%20scraping%20blocked",
    quote:
      "Static fetch is useless for this site. I need a real browser, but managing proxies and retries is painful.",
    extractedAt: demoGeneratedAt,
    matchedTerms: ["javascript", "scraping", "browser", "proxy"],
    toolsMentioned: ["proxies", "JavaScript rendering"],
    painCategory: "dynamic_js_extraction",
    urgency: "medium",
    engagement: 47,
    engagementDetails: { score: 41, comments: 6 },
    evidenceKind: "post",
    sourceReliabilityOverride: 0.62,
  },
];

const demoSignalScores: SignalScore[] = [
  {
    signalId: "demo-1",
    relevance: 0.91,
    painIntensity: 0.9,
    commercialIntent: 0.62,
    hyperbrowserFit: 0.88,
    recency: 0.45,
    sourceReliability: 0.76,
    confidence: 0.86,
    total: 0.79,
    reasons: [
      "Matches query terms: playwright, blocked",
      "High pain language detected (high urgency)",
      "Maps to browser automation or web extraction problems",
    ],
  },
  {
    signalId: "demo-2",
    relevance: 0.72,
    painIntensity: 0.82,
    commercialIntent: 0.86,
    hyperbrowserFit: 0.8,
    recency: 0.45,
    sourceReliability: 0.86,
    confidence: 0.82,
    total: 0.77,
    reasons: [
      "Contains production, team, scale, or infrastructure language",
      "GitHub issue signal tends to represent concrete implementation pain",
    ],
  },
  {
    signalId: "demo-3",
    relevance: 0.68,
    painIntensity: 0.7,
    commercialIntent: 0.42,
    hyperbrowserFit: 0.78,
    recency: 0.45,
    sourceReliability: 0.62,
    confidence: 0.78,
    total: 0.66,
    reasons: [
      "Maps to browser automation or web extraction problems",
      "Medium pain language detected",
    ],
  },
];

export function buildDemoResult(
  query = "browser automation pain",
  requestedAnalysisMode: AnalysisMode = "balanced",
  mode?: AnalysisModeResolution
): MineResult {
  const generatedAt = new Date().toISOString();
  const modeResolution = mode ?? {
    requestedAnalysisMode,
    effectiveAnalysisMode: "deterministic" as const,
    analysisMode: "demo" as const,
    allowedCalls: 0,
    downgradeReason:
      "No Hyperbrowser API key configured; demo mode uses deterministic sample data.",
  };
  const clusters = [
    {
      id: "cluster-anti-bot",
      title: "Anti-bot failures break developer automation",
      summary:
        "Developers can build a working local browser script, but production targets fail once anti-bot checks, captchas, or login walls appear.",
      frequency: 2,
      urgency: "high" as const,
      representativeQuotes: [demoSignals[0].quote, demoSignals[2].quote],
      relatedTools: ["Playwright", "Puppeteer", "Cloudflare", "proxies"],
      signalIds: ["demo-1", "demo-3"],
      sourceDiversity: 2,
      averagePainIntensity: 0.85,
      averageHyperbrowserFit: 0.83,
      clusterStrength: 0.72,
      confidence: 0.82,
    },
    {
      id: "cluster-browser-infra",
      title: "Browser fleet operations distract from core product work",
      summary:
        "Teams want reliable browser sessions, retries, and persistence without owning the infrastructure layer themselves.",
      frequency: 1,
      urgency: "high" as const,
      representativeQuotes: [demoSignals[1].quote],
      relatedTools: ["browser sessions", "Puppeteer"],
      signalIds: ["demo-2"],
      sourceDiversity: 1,
      averagePainIntensity: 0.82,
      averageHyperbrowserFit: 0.8,
      clusterStrength: 0.45,
      confidence: 0.82,
    },
  ];
  const growthPlays = [
    {
      id: "play-content-1",
      channel: "content" as const,
      title: "Publish an anti-bot survival guide for AI browser agents",
      insight:
        "The clearest high-intent pain is reliability once real-world defenses appear.",
      recommendedAction:
        "Ship a technical guide comparing local Playwright scripts with managed cloud-browser execution under messy production constraints.",
      copyDraft:
        "Your Playwright script works locally. Production websites have other plans.",
      supportingSignalIds: ["demo-1", "demo-3"],
      score: {
        playId: "play-content-1",
        commercialValue: 0.56,
        evidenceStrength: 0.72,
        channelFit: 0.82,
        executionCost: 0.2,
        confidence: 0.82,
        expectedValue: 0.07,
        reasons: ["2 supporting signals", "2 source types represented"],
      },
    },
    {
      id: "play-outbound-1",
      channel: "outbound" as const,
      title: "Target teams maintaining browser fleets",
      insight:
        "Developers who describe browser ops as becoming the product are strong Hyperbrowser prospects.",
      recommendedAction:
        "Run outbound to teams with public issues or posts mentioning persistent sessions, retries, and proxy management.",
      copyDraft:
        "Saw your team wrestling with persistent browser sessions. Hyperbrowser handles managed browser infra so your automation code stays the product, not the fleet.",
      supportingSignalIds: ["demo-2"],
      score: {
        playId: "play-outbound-1",
        commercialValue: 0.86,
        evidenceStrength: 0.45,
        channelFit: 0.82,
        executionCost: 0.13,
        confidence: 0.82,
        expectedValue: 0.13,
        reasons: ["1 supporting signal", "GitHub implementation pain"],
      },
    },
  ];

  return {
    query,
    generatedAt,
    mode: "demo",
    signals: demoSignals,
    clusters,
    growthPlays,
    outboundDrafts: [
      "Saw your post about browser automation breaking behind anti-bot checks. Hyperbrowser is built for hosted browser sessions that survive messy production sites.",
      "If maintaining proxies, sessions, and retries is eating roadmap time, Hyperbrowser can take that browser infrastructure layer off your team.",
    ],
    contentAngles: [
      "Local Playwright vs. production browser automation: what changes when real sites fight back",
      "The hidden cost of self-hosting browser fleets for AI agents",
      "How to turn brittle scraping scripts into durable web data pipelines",
    ],
    signalScores: demoSignalScores,
    dedupeGroups: [],
    brief: buildGrowthBrief({
      query,
      analysisMode: modeResolution.effectiveAnalysisMode,
      clusters,
      growthPlays,
      signals: demoSignals,
      generatedAt,
    }),
    metadata: {
      searchedSources: ["hackernews", "github", "reddit"],
      errors: [],
      notes: [
        "Demo mode is shown when HYPERBROWSER_API_KEY is not configured.",
        "Configure HYPERBROWSER_API_KEY for live public evidence collection.",
      ],
      requestedAnalysisMode: modeResolution.requestedAnalysisMode,
      effectiveAnalysisMode: modeResolution.effectiveAnalysisMode,
      analysisMode: modeResolution.analysisMode,
      downgradeReason: modeResolution.downgradeReason,
      llm: {
        queryExpansionMode: "disabled",
        judgmentMode: "disabled",
        synthesisMode: "disabled",
        callsAttempted: 0,
      },
    },
  };
}
