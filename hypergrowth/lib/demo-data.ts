import type { MineResult, PainSignal } from "./types";

export const demoSignals: PainSignal[] = [
  {
    id: "demo-1",
    source: "hackernews",
    title: "Playwright keeps getting blocked on production sites",
    url: "https://news.ycombinator.com/",
    quote:
      "The script works locally, then falls over once Cloudflare or a login wall gets involved.",
    toolsMentioned: ["Playwright", "Cloudflare"],
    painCategory: "anti-bot reliability",
    urgency: "high",
    engagement: 84,
  },
  {
    id: "demo-2",
    source: "github",
    title: "Browser sessions are hard to keep alive at scale",
    url: "https://github.com/search?q=browser+session+scraping&type=issues",
    quote:
      "We need persistent browser state across retries, but self-hosting the browser fleet is becoming the product.",
    toolsMentioned: ["Puppeteer", "browser sessions"],
    painCategory: "browser infrastructure",
    urgency: "high",
    engagement: 31,
  },
  {
    id: "demo-3",
    source: "reddit",
    title: "Scraping JavaScript-heavy pages is brittle",
    url: "https://www.reddit.com/search/?q=javascript%20scraping%20blocked",
    quote:
      "Static fetch is useless for this site. I need a real browser, but managing proxies and retries is painful.",
    toolsMentioned: ["proxies", "JavaScript rendering"],
    painCategory: "dynamic page extraction",
    urgency: "medium",
    engagement: 47,
  },
];

export function buildDemoResult(query = "browser automation pain"): MineResult {
  return {
    query,
    generatedAt: new Date().toISOString(),
    mode: "demo",
    signals: demoSignals,
    clusters: [
      {
        id: "cluster-anti-bot",
        title: "Anti-bot failures break developer automation",
        summary:
          "Developers can build a working local browser script, but production targets fail once anti-bot checks, captchas, or login walls appear.",
        frequency: 2,
        urgency: "high",
        representativeQuotes: [demoSignals[0].quote, demoSignals[2].quote],
        relatedTools: ["Playwright", "Puppeteer", "Cloudflare", "proxies"],
        signalIds: ["demo-1", "demo-3"],
      },
      {
        id: "cluster-browser-infra",
        title: "Browser fleet operations distract from core product work",
        summary:
          "Teams want reliable browser sessions, retries, and persistence without owning the infrastructure layer themselves.",
        frequency: 1,
        urgency: "high",
        representativeQuotes: [demoSignals[1].quote],
        relatedTools: ["browser sessions", "Puppeteer"],
        signalIds: ["demo-2"],
      },
    ],
    growthPlays: [
      {
        id: "play-content-1",
        channel: "content",
        title: "Publish an anti-bot survival guide for AI browser agents",
        insight:
          "The clearest high-intent pain is reliability once real-world defenses appear.",
        recommendedAction:
          "Ship a technical guide comparing local Playwright scripts with managed cloud-browser execution under messy production constraints.",
        copyDraft:
          "Your Playwright script works locally. Production websites have other plans.",
        supportingSignalIds: ["demo-1", "demo-3"],
      },
      {
        id: "play-outbound-1",
        channel: "outbound",
        title: "Target teams maintaining browser fleets",
        insight:
          "Developers who describe browser ops as becoming the product are strong Hyperbrowser prospects.",
        recommendedAction:
          "Run outbound to teams with public issues or posts mentioning persistent sessions, retries, and proxy management.",
        copyDraft:
          "Saw your team wrestling with persistent browser sessions. Hyperbrowser handles managed browser infra so your automation code stays the product, not the fleet.",
        supportingSignalIds: ["demo-2"],
      },
    ],
    outboundDrafts: [
      "Saw your post about browser automation breaking behind anti-bot checks. Hyperbrowser is built for hosted browser sessions that survive messy production sites.",
      "If maintaining proxies, sessions, and retries is eating roadmap time, Hyperbrowser can take that browser infrastructure layer off your team.",
    ],
    contentAngles: [
      "Local Playwright vs. production browser automation: what changes when real sites fight back",
      "The hidden cost of self-hosting browser fleets for AI agents",
      "How to turn brittle scraping scripts into durable web data pipelines",
    ],
    metadata: {
      searchedSources: ["hackernews", "github", "reddit"],
      errors: [],
      notes: [
        "Demo mode is shown when HYPERBROWSER_API_KEY is not configured.",
        "Add OPENAI_API_KEY to enable LLM clustering instead of heuristic synthesis.",
      ],
    },
  };
}
