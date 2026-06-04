import { z } from "zod";
import { extractJsonObject } from "../json-utils";
import { isLLMTransportError } from "../llm/errors";
import { getLLMClient } from "../llm/provider";
import { tokenize, unique } from "../text";
import type { OpenWebTargets, SignalSource } from "../types";
import type { ResearchPlan, ResearchSearch } from "./types";

const planSchema = z.object({
  rationale: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string" && value.trim()) return [value.trim()];
      return [];
    }),
  searches: z.array(
    z.object({
      source: z.enum(["hackernews", "github", "hyperbrowser"]),
      query: z.string(),
      rationale: z.string().default("Source-specific discovery."),
    })
  ),
});

export async function createResearchPlan({
  query,
  selectedSources,
  openWebTargets,
  allowLLM,
}: {
  query: string;
  selectedSources: SignalSource[];
  openWebTargets: OpenWebTargets;
  allowLLM: boolean;
}): Promise<{
  plan: ResearchPlan;
  callsAttempted: number;
  mode: "disabled" | "used" | "fallback";
  failureReason?: string;
}> {
  if (!allowLLM) {
    return {
      plan: buildStaticResearchPlan(query, selectedSources, openWebTargets),
      callsAttempted: 0,
      mode: "disabled",
    };
  }

  const llm = getLLMClient();
  if (!llm) {
    return {
      plan: buildStaticResearchPlan(query, selectedSources, openWebTargets),
      callsAttempted: 0,
      mode: "fallback",
      failureReason: "No LLM provider configured for autonomous planning.",
    };
  }

  try {
    const response = await llm.client.chat.completions.create({
      model: llm.metadata.model ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You plan source-specific research for HyperGrowth, a Hyperbrowser GTM signal miner. Return strict JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Generate API and web-search queries that can reveal concrete developer pain.",
            originalQuery: query,
            selectedSources,
            openWebTargets,
            constraints: [
              "Hacker News queries must be terse keyword searches, ideally 2 to 5 words.",
              "GitHub queries should use GitHub issue/search language and can include is:issue.",
              "Hyperbrowser queries should target general open-web discovery (blogs, forums, docs) rather than duplicating GitHub or Hacker News searches.",
              "Do not use site:github.com or site:news.ycombinator.com in Hyperbrowser queries; those platforms are handled by their own specific sources.",
              "For configured subreddits, Hyperbrowser may use site:reddit.com/r/{subreddit}; otherwise do not target Reddit by default.",
              "Avoid natural-language question queries for Hacker News.",
              "Avoid generic terms like developer pain points or market research.",
              "Return enough searches to cover distinct research angles.",
              "Use multiple Hyperbrowser searches when the topic has multiple possible failure modes.",
              "Include at least one Hacker News query when Hacker News is selected.",
              "Include at least one GitHub issue query when GitHub is selected.",
            ],
            outputShape: {
              rationale: ["string"],
              searches: [
                {
                  source: "hackernews | github | hyperbrowser",
                  query: "string",
                  rationale: "string",
                },
              ],
            },
          }),
        },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("LLM returned empty research plan.");

    const parsed = parseResearchPlanContent(content);
    const searches = ensureSourceCoverage(
      sanitizeSearches(parsed.searches, query, selectedSources, openWebTargets),
      query,
      selectedSources,
      openWebTargets
    );
    const plan: ResearchPlan = {
      strategy: "llm-autonomous",
      originalQuery: query,
      waves: [
        {
          index: 1,
          searches: orderHyperbrowserFirst(
            searches.length
              ? searches
              : buildStaticResearchPlan(query, selectedSources, openWebTargets)
                  .waves[0].searches,
            query,
            openWebTargets
          ),
          reason: "Initial LLM-planned source discovery.",
        },
      ],
      rationale: parsed.rationale.slice(0, 5),
    };

    return { plan, callsAttempted: 1, mode: "used" };
  } catch (error) {
    return {
      plan: buildStaticResearchPlan(query, selectedSources, openWebTargets),
      callsAttempted: 1,
      mode: isLLMTransportError(error) ? "fallback" : "fallback",
      failureReason: `Autonomous planning failed: ${error}`,
    };
  }
}

export function parseResearchPlanContent(content: string): z.infer<typeof planSchema> {
  return planSchema.parse(extractJsonObject(content));
}

export function buildStaticResearchPlan(
  query: string,
  selectedSources: SignalSource[],
  openWebTargets: OpenWebTargets
): ResearchPlan {
  const searches: ResearchSearch[] = [];
  const keyTerms = terseKeywords(query);
  const effectiveSources = unique([...selectedSources, "hyperbrowser" as const]);

  if (effectiveSources.includes("hyperbrowser")) {
    if (openWebTargets.includeBroadWeb) {
      for (const webQuery of buildHyperbrowserDiscoveryQueries(query).slice(0, 3)) {
        searches.push({
          source: "hyperbrowser",
          query: webQuery,
          reason: "expanded",
          rationale: "Hyperbrowser-first open-web discovery.",
        });
      }
    }

    for (const subreddit of openWebTargets.redditSubreddits.slice(0, 2)) {
      searches.push({
        source: "hyperbrowser",
        query: `site:reddit.com/r/${subreddit} ${keyTerms}`,
        reason: "expanded",
        rationale: "Configured subreddit discovery through Hyperbrowser Search.",
      });
    }
  }

  if (effectiveSources.includes("hackernews")) {
    for (const hnQuery of buildHackerNewsQueries(query).slice(0, 2)) {
      searches.push({
        source: "hackernews",
        query: hnQuery,
        reason: "expanded",
        rationale: "Terse HN keyword query.",
      });
    }
  }

  if (effectiveSources.includes("github")) {
    for (const githubQuery of unique([
      `${keyTerms} is:issue`,
      `${keyTerms} bug is:issue`,
    ]).slice(0, 2)) {
      searches.push({
        source: "github",
        query: githubQuery,
        reason: "expanded",
        rationale: "GitHub issue discovery query.",
      });
    }
  }

  return {
    strategy: "static-autonomous",
    originalQuery: query,
    waves: [
      {
        index: 1,
        searches,
        reason: "Static source-aware autonomous fallback.",
      },
    ],
    rationale: [
      "Use terse source-specific searches before fetching concrete pages.",
    ],
  };
}

export async function createGapExpansionSearches({
  query,
  selectedSources,
  openWebTargets,
  executedSearches,
  acceptedEvidence,
  rejectedCandidates,
  allowLLM,
}: {
  query: string;
  selectedSources: SignalSource[];
  openWebTargets: OpenWebTargets;
  executedSearches: ResearchSearch[];
  acceptedEvidence: Array<{ source: SignalSource; title: string; quote: string }>;
  rejectedCandidates: Array<{ source: SignalSource; title: string; flags: string[] }>;
  allowLLM: boolean;
}): Promise<{
  searches: ResearchSearch[];
  callsAttempted: number;
  mode: "disabled" | "used" | "fallback";
  failureReason?: string;
}> {
  if (!allowLLM) {
    return { searches: [], callsAttempted: 0, mode: "disabled" };
  }

  const llm = getLLMClient();
  if (!llm) {
    return {
      searches: [],
      callsAttempted: 0,
      mode: "fallback",
      failureReason: "No LLM provider configured for gap expansion.",
    };
  }

  try {
    const response = await llm.client.chat.completions.create({
      model: llm.metadata.model ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You expand incomplete HyperGrowth research. Return strict JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Find missing research angles and return only new searches worth running.",
            originalQuery: query,
            selectedSources,
            openWebTargets,
            executedSearches: executedSearches.map((search) => ({
              source: search.source,
              query: search.query,
            })),
            acceptedEvidence: acceptedEvidence.slice(0, 8),
            rejectedCandidates: rejectedCandidates.slice(0, 8),
            constraints: [
              "Do not repeat an executed search.",
              "Prefer sources with little or no accepted evidence so far.",
              "Use Hacker News terse keyword searches when Hacker News is selected.",
              "Use GitHub issue search syntax when GitHub is selected.",
              "Use Hyperbrowser for general open-web discovery (blogs, forums, docs) rather than duplicating GitHub or Hacker News searches.",
              "Do not use site:github.com or site:news.ycombinator.com in Hyperbrowser queries.",
              "Do not target Reddit unless explicit subreddit targets were provided.",
            ],
            outputShape: {
              rationale: ["string"],
              searches: [
                {
                  source: "hackernews | github | hyperbrowser",
                  query: "string",
                  rationale: "string",
                },
              ],
            },
          }),
        },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("LLM returned empty gap expansion.");
    const parsed = parseResearchPlanContent(content);
    const seen = new Set(
      executedSearches.map((search) => `${search.source}:${search.query}`)
    );
    const searches = ensureSourceCoverage(
      sanitizeSearches(parsed.searches, query, selectedSources, openWebTargets),
      query,
      selectedSources,
      openWebTargets
    ).filter((search) => !seen.has(`${search.source}:${search.query}`));

    return { searches, callsAttempted: 1, mode: "used" };
  } catch (error) {
    return {
      searches: [],
      callsAttempted: 1,
      mode: "fallback",
      failureReason: `Gap expansion failed: ${error}`,
    };
  }
}

function sanitizeSearches(
  searches: Array<{ source: SignalSource; query: string; rationale: string }>,
  originalQuery: string,
  selectedSources: SignalSource[],
  openWebTargets: OpenWebTargets
): ResearchSearch[] {
  const allowed = new Set(unique([...selectedSources, "hyperbrowser" as const]));
  const fallbackTerms = terseKeywords(originalQuery);
  const explicitRedditTargets = openWebTargets.redditSubreddits.length > 0;
  const seen = new Set<string>();

  return searches
    .map((search) => ({
      source: search.source,
      query:
        search.source === "hackernews"
          ? sanitizeHackerNewsQuery(search.query, fallbackTerms)
          : search.query.replace(/\s+/g, " ").trim(),
      reason: "expanded" as const,
      rationale: search.rationale || "LLM-planned search.",
    }))
    .filter((search) => allowed.has(search.source))
    .filter((search) => search.query.length >= 3 && search.query.length <= 96)
    .filter((search) => {
      if (!explicitRedditTargets && /(^|\s)site:reddit\.com/i.test(search.query)) {
        return false;
      }
      const key = `${search.source}:${search.query.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) =>
      left.source === "hyperbrowser" && right.source !== "hyperbrowser"
        ? -1
        : left.source !== "hyperbrowser" && right.source === "hyperbrowser"
          ? 1
          : 0
    );
}

function ensureSourceCoverage(
  searches: ResearchSearch[],
  query: string,
  selectedSources: SignalSource[],
  openWebTargets: OpenWebTargets
): ResearchSearch[] {
  const effectiveSources = unique([...selectedSources, "hyperbrowser" as const]);
  const next = [...searches];

  for (const source of effectiveSources) {
    if (source === "reddit") continue;
    if (next.some((search) => search.source === source)) continue;
    const fallback = fallbackSearchForSource(source, query, openWebTargets);
    if (fallback) next.push(fallback);
  }

  return orderHyperbrowserFirst(next, query, openWebTargets);
}

function fallbackSearchForSource(
  source: SignalSource,
  query: string,
  openWebTargets: OpenWebTargets
): ResearchSearch | undefined {
  if (source === "hyperbrowser") {
    return {
      source,
      query: query.slice(0, 96),
      reason: "expanded",
      rationale: "Coverage repair: mandatory Hyperbrowser discovery.",
    };
  }

  if (source === "hackernews") {
    return {
      source,
      query: sanitizeHackerNewsQuery(query, terseKeywords(query)),
      reason: "expanded",
      rationale: "Coverage repair: selected Hacker News enrichment.",
    };
  }

  if (source === "github") {
    return {
      source,
      query: `${terseKeywords(query)} is:issue`.slice(0, 96),
      reason: "expanded",
      rationale: "Coverage repair: selected GitHub issue enrichment.",
    };
  }

  if (source === "reddit" && openWebTargets.redditSubreddits.length > 0) {
    return {
      source: "hyperbrowser",
      query: `site:reddit.com/r/${openWebTargets.redditSubreddits[0]} ${terseKeywords(query)}`,
      reason: "expanded",
      rationale: "Coverage repair: explicit subreddit target.",
    };
  }

  return undefined;
}

function orderHyperbrowserFirst(
  searches: ResearchSearch[],
  query: string,
  openWebTargets: OpenWebTargets
): ResearchSearch[] {
  const hasHyperbrowser = searches.some((search) => search.source === "hyperbrowser");
  const discovery = hasHyperbrowser
    ? searches.filter((search) => search.source === "hyperbrowser")
    : buildStaticResearchPlan(query, ["hyperbrowser"], openWebTargets).waves[0].searches;
  const enrichment = searches.filter((search) => search.source !== "hyperbrowser");

  return [...discovery, ...enrichment];
}

function sanitizeHackerNewsQuery(query: string, fallback: string): string {
  const lower = query.toLowerCase();
  const hasCaptcha = /captcha|recaptcha|hcaptcha|cloudflare|anti.?bot/.test(lower);
  const hasAutomation = /playwright|puppeteer|selenium|browser|automation|scrap/.test(
    lower
  );

  if (hasCaptcha && hasAutomation) {
    return buildHackerNewsQueries(query)[0] ?? fallback;
  }

  const tokens = tokenize(query)
    .filter((token) => !hnNoiseTokens.has(token))
    .slice(0, 5);
  return tokens.length ? tokens.join(" ") : fallback;
}

function terseKeywords(query: string): string {
  const tokens = tokenize(query);
  const toolTokens = tokens.filter((token) =>
    /playwright|puppeteer|selenium|captcha|cloudflare|browser|automation|scraping|proxy|bot/.test(
      token
    )
  );
  const chosen =
    toolTokens.length >= 2
      ? unique(toolTokens).slice(0, 4)
      : unique([...toolTokens, ...tokens]).slice(0, 4);
  return chosen.length ? chosen.join(" ") : query.slice(0, 60);
}

function buildHyperbrowserDiscoveryQueries(query: string): string[] {
  const keyTerms = terseKeywords(query);
  const hnQueries = buildHackerNewsQueries(query);

  return unique([
    `${keyTerms} workaround`,
    `${keyTerms} production failure`,
    `${keyTerms} developer discussion`,
    ...hnQueries.map((item) => `${item} discussion`),
  ]).filter((item) => item.length >= 3);
}

function buildHackerNewsQueries(query: string): string[] {
  const tokens = tokenize(query);
  const tokenSet = new Set(tokens);
  const hasCaptcha =
    tokenSet.has("captcha") ||
    tokenSet.has("recaptcha") ||
    tokenSet.has("hcaptcha") ||
    tokenSet.has("cloudflare");
  const tool = ["playwright", "puppeteer", "selenium"].find((item) =>
    tokenSet.has(item)
  );
  const queries: string[] = [];

  if (tool && hasCaptcha) {
    queries.push(`${tool} captcha`);
  }

  if (tokenSet.has("cloudflare")) {
    queries.push(tool ? `${tool} cloudflare` : "cloudflare captcha");
  }

  if (hasCaptcha) {
    queries.push("browser automation captcha");
    queries.push("scraping captcha");
  }

  if (tokenSet.has("proxy") || tokenSet.has("proxies")) {
    queries.push("scraping proxies");
  }

  queries.push(terseKeywords(query));

  return unique(queries)
    .map((item) =>
      tokenize(item)
        .filter((token) => !hnNoiseTokens.has(token))
        .slice(0, 5)
        .join(" ")
    )
    .filter((item) => item.length >= 3);
}

const hnNoiseTokens = new Set([
  "cause",
  "causes",
  "using",
  "while",
  "into",
  "errors",
  "error",
  "automated",
  "running",
]);
