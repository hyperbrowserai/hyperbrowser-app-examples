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
              "Hyperbrowser queries should target open-web pages worth fetching.",
              "For configured subreddits, Hyperbrowser may use site:reddit.com/r/{subreddit}.",
              "Avoid natural-language question queries for Hacker News.",
              "Avoid generic terms like developer pain points or market research.",
              "Return at most 2 queries per selected source.",
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
    const searches = sanitizeSearches(parsed.searches, query, selectedSources);
    const plan: ResearchPlan = {
      strategy: "llm-autonomous",
      originalQuery: query,
      waves: [
        {
          index: 1,
          searches: searches.length
            ? searches
            : buildStaticResearchPlan(query, selectedSources, openWebTargets)
                .waves[0].searches,
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

  if (selectedSources.includes("hackernews")) {
    for (const hnQuery of buildHackerNewsQueries(query).slice(0, 2)) {
      searches.push({
        source: "hackernews",
        query: hnQuery,
        reason: "expanded",
        rationale: "Terse HN keyword query.",
      });
    }
  }

  if (selectedSources.includes("github")) {
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

  if (selectedSources.includes("hyperbrowser")) {
    if (openWebTargets.includeBroadWeb) {
      searches.push({
        source: "hyperbrowser",
        query: `${keyTerms} workaround`,
        reason: "expanded",
        rationale: "Broad open-web workaround discovery.",
      });
    }

    for (const subreddit of openWebTargets.redditSubreddits.slice(0, 2)) {
      searches.push({
        source: "hyperbrowser",
        query: `site:reddit.com/r/${subreddit} ${keyTerms}`,
        reason: "expanded",
        rationale: "Configured subreddit open-web discovery through Hyperbrowser.",
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

function sanitizeSearches(
  searches: Array<{ source: SignalSource; query: string; rationale: string }>,
  originalQuery: string,
  selectedSources: SignalSource[]
): ResearchSearch[] {
  const allowed = new Set(selectedSources);
  const bySource = new Map<SignalSource, number>();
  const fallbackTerms = terseKeywords(originalQuery);

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
      const count = bySource.get(search.source) ?? 0;
      if (count >= 2) return false;
      bySource.set(search.source, count + 1);
      return true;
    });
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
