import { z } from "zod";
import { extractJsonObject } from "./json-utils";
import { isLLMTransportError } from "./llm/errors";
import { getLLMClient } from "./llm/provider";
import {
  hyperbrowserFitTerms,
  painTerms,
  toolTerms,
} from "./taxonomy";
import { tokenize, unique } from "./text";
import type { OpenWebTargets, QueryPlan, SignalSource } from "./types";

const emptySourceQueries: Record<SignalSource, string[]> = {
  github: [],
  hackernews: [],
  reddit: [],
  hyperbrowser: [],
};

const queryPlanSchema = z.object({
  originalQuery: z.string(),
  strategy: z.enum([
    "llm-source-routed",
    "static-source-routed",
    "original-only",
  ]),
  sourceQueries: z.object({
    github: z.array(z.string()).default([]),
    hackernews: z.array(z.string()).default([]),
    reddit: z.array(z.string()).default([]),
    hyperbrowser: z.array(z.string()).default([]),
  }),
  sourceWeights: z
    .object({
      github: z.number().optional(),
      hackernews: z.number().optional(),
      reddit: z.number().optional(),
      hyperbrowser: z.number().optional(),
    })
    .optional(),
  rationale: z.array(z.string()).default([]),
});

export async function buildQueryPlan({
  query,
  selectedSources,
  allowLLM,
  openWebTargets = defaultOpenWebTargets,
}: {
  query: string;
  selectedSources: SignalSource[];
  allowLLM: boolean;
  openWebTargets?: OpenWebTargets;
}): Promise<{ plan: QueryPlan; callsAttempted: number; failureReason?: string }> {
  if (!allowLLM) {
    return {
      plan: buildStaticQueryPlan(
        query,
        selectedSources,
        "static-source-routed",
        openWebTargets
      ),
      callsAttempted: 0,
    };
  }

  const llm = getLLMClient();
  if (!llm) {
    return {
      plan: buildStaticQueryPlan(
        query,
        selectedSources,
        "static-source-routed",
        openWebTargets
      ),
      callsAttempted: 0,
      failureReason: "No LLM provider configured for query expansion.",
    };
  }

  let callsAttempted = 0;

  try {
    callsAttempted += 1;
    const plan = await requestQueryPlan({
      query,
      selectedSources,
      repairInput: null,
      openWebTargets,
    });
    return { plan, callsAttempted };
  } catch (firstError) {
    if (isLLMTransportError(firstError)) {
      return {
      plan: buildStaticQueryPlan(
        query,
        selectedSources,
        "static-source-routed",
        openWebTargets
      ),
        callsAttempted,
        failureReason: `Query expansion transport failed: ${firstError}`,
      };
    }

    try {
      callsAttempted += 1;
      const plan = await requestQueryPlan({
        query,
        selectedSources,
        repairInput: String(firstError),
        openWebTargets,
      });
      return { plan, callsAttempted };
    } catch (repairError) {
      return {
        plan: buildStaticQueryPlan(
          query,
          selectedSources,
          "static-source-routed",
          openWebTargets
        ),
        callsAttempted,
        failureReason: `Query expansion failed after repair: ${repairError}`,
      };
    }
  }
}

export function buildStaticQueryPlan(
  query: string,
  selectedSources: SignalSource[],
  strategy: QueryPlan["strategy"] = "static-source-routed",
  openWebTargets: OpenWebTargets = defaultOpenWebTargets
): QueryPlan {
  const sourceQueries: Record<SignalSource, string[]> = {
    ...emptySourceQueries,
  };

  if (selectedSources.includes("github")) {
    sourceQueries.github = [
      `${query} issue`,
      `${query} failed`,
      `${query} session timeout`,
    ];
  }

  if (selectedSources.includes("hackernews")) {
    sourceQueries.hackernews = [
      `${query} browser automation`,
      `${query} anti bot`,
      `${query} scraping infrastructure`,
    ];
  }

  if (selectedSources.includes("reddit")) {
    sourceQueries.reddit = [
      `${query} not working`,
      `${query} help`,
      `${query} keeps getting blocked`,
    ];
  }

  if (selectedSources.includes("hyperbrowser")) {
    sourceQueries.hyperbrowser = buildOpenWebQueries(query, openWebTargets);
  }

  return validateQueryPlan(
    {
      originalQuery: query,
      strategy,
      sourceQueries,
      rationale: [
        "Static source-routed fallback uses issue language for GitHub, category language for Hacker News, and Hyperbrowser open-web queries biased by configured subreddit targets.",
      ],
    },
    query,
    selectedSources
  );
}

function requestQueryPlan({
  query,
  selectedSources,
  repairInput,
  openWebTargets = defaultOpenWebTargets,
}: {
  query: string;
  selectedSources: SignalSource[];
  repairInput: string | null;
  openWebTargets?: OpenWebTargets;
}): Promise<QueryPlan> {
  const llm = getLLMClient();
  if (!llm) throw new Error("No LLM provider configured.");

  return llm.client.chat.completions
    .create({
      model: llm.metadata.model ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You create source-aware search queries for HyperGrowth, a Hyperbrowser-specific developer GTM signal miner. Return strict JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: repairInput
              ? "Repair the previous query plan failure and return valid JSON."
              : "Generate a source-aware query plan.",
            previousFailure: repairInput,
            originalQuery: query,
            selectedSources,
            openWebTargets,
            constraints: [
              "GitHub queries should use issue/failure language.",
              "Hacker News queries should use market/category language.",
              "Reddit queries should use frustration/workaround language.",
              "Hyperbrowser queries should include broad open-web discovery when includeBroadWeb is true.",
              "Hyperbrowser queries should include site:reddit.com/r/{subreddit} searches for the supplied redditSubreddits when relevant.",
              "Return at most 3 queries per source.",
              "Queries must be 80 characters or fewer.",
              "Avoid vague phrases like developer pain points.",
              "Prefer phrases developers would actually write publicly.",
            ],
            shape: {
              originalQuery: query,
              strategy: "llm-source-routed",
              sourceQueries: {
                github: ["string"],
                hackernews: ["string"],
                reddit: ["string"],
                hyperbrowser: ["string"],
              },
              sourceWeights: {
                github: 0.9,
                hackernews: 0.5,
                reddit: 0.7,
                hyperbrowser: 0.8,
              },
              rationale: ["string"],
            },
          }),
        },
      ],
    })
    .then((response) => {
      const content = response.choices[0]?.message.content;
      if (!content) throw new Error("LLM returned empty query plan.");
      const parsed = extractJsonObject(content);
      return validateQueryPlan(
        parsed,
        query,
        selectedSources,
        "llm-source-routed",
        openWebTargets
      );
    });
}

export function validateQueryPlan(
  input: unknown,
  originalQuery: string,
  selectedSources: SignalSource[],
  forcedStrategy?: QueryPlan["strategy"],
  openWebTargets: OpenWebTargets = defaultOpenWebTargets
): QueryPlan {
  const parsed = queryPlanSchema.parse(input);
  const allowedTerms = unique([
    ...tokenize(originalQuery),
    ...toolTerms,
    ...painTerms,
    ...hyperbrowserFitTerms,
  ]);
  const sourceQueries: Record<SignalSource, string[]> = {
    ...emptySourceQueries,
  };

  for (const source of selectedSources) {
    sourceQueries[source] = sanitizeQueries(
      parsed.sourceQueries[source] ?? [],
      originalQuery,
      allowedTerms
    ).slice(0, 3);
  }

  if (selectedSources.includes("hyperbrowser")) {
    sourceQueries.hyperbrowser = mergeHyperbrowserQueries(
      sourceQueries.hyperbrowser,
      originalQuery,
      openWebTargets
    );
  }

  return {
    originalQuery,
    strategy: forcedStrategy ?? parsed.strategy,
    sourceQueries,
    sourceWeights: sanitizeSourceWeights(parsed.sourceWeights, selectedSources),
    rationale: parsed.rationale
      .filter((item) => typeof item === "string")
      .slice(0, 5),
  };
}

const defaultOpenWebTargets: OpenWebTargets = {
  includeBroadWeb: true,
  redditSubreddits: [
    "webscraping",
    "playwright",
    "puppeteer",
    "automation",
    "webdev",
  ],
};

function buildOpenWebQueries(
  query: string,
  openWebTargets: OpenWebTargets
): string[] {
  return mergeHyperbrowserQueries([], query, openWebTargets);
}

function mergeHyperbrowserQueries(
  llmQueries: string[],
  query: string,
  openWebTargets: OpenWebTargets
): string[] {
  const broadQueries = openWebTargets.includeBroadWeb
    ? [`${query} workaround`]
    : [];
  const subredditQueries = openWebTargets.redditSubreddits
    .slice(0, 3)
    .map((subreddit) => `site:reddit.com/r/${subreddit} ${query}`);

  return unique([...llmQueries, ...broadQueries, ...subredditQueries])
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 3)
    .slice(0, 4);
}

function sanitizeSourceWeights(
  weights: QueryPlan["sourceWeights"],
  selectedSources: SignalSource[]
): QueryPlan["sourceWeights"] {
  if (!weights) return undefined;

  const sanitized: Partial<Record<SignalSource, number>> = {};

  for (const source of selectedSources) {
    const value = weights[source];
    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[source] = Math.max(0, Math.min(1, Number(value.toFixed(2))));
    }
  }

  return sanitized;
}

function sanitizeQueries(
  queries: string[],
  originalQuery: string,
  allowedTerms: string[]
): string[] {
  const vague = ["developer pain points", "growth ideas", "market research"];
  const sanitized = queries
    .map((query) => query.replace(/\s+/g, " ").trim())
    .filter((query) => query.length >= 3 && query.length <= 80)
    .filter((query) => !vague.some((term) => query.toLowerCase().includes(term)))
    .filter((query) => {
      const tokens = tokenize(query);
      if (tokens.length === 0) return false;
      return tokens.some((token) => allowedTerms.includes(token));
    });

  const withOriginalRemoved = sanitized.filter(
    (query) => query.toLowerCase() !== originalQuery.toLowerCase()
  );

  return unique(withOriginalRemoved);
}
