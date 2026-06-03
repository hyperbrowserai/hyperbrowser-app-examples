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
import type { QueryPlan, SignalSource } from "./types";

const emptySourceQueries: Record<SignalSource, string[]> = {
  github: [],
  hackernews: [],
  reddit: [],
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
  }),
  rationale: z.array(z.string()).default([]),
});

export async function buildQueryPlan({
  query,
  selectedSources,
  allowLLM,
}: {
  query: string;
  selectedSources: SignalSource[];
  allowLLM: boolean;
}): Promise<{ plan: QueryPlan; callsAttempted: number; failureReason?: string }> {
  if (!allowLLM) {
    return {
      plan: buildStaticQueryPlan(query, selectedSources, "static-source-routed"),
      callsAttempted: 0,
    };
  }

  const llm = getLLMClient();
  if (!llm) {
    return {
      plan: buildStaticQueryPlan(query, selectedSources, "static-source-routed"),
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
    });
    return { plan, callsAttempted };
  } catch (firstError) {
    if (isLLMTransportError(firstError)) {
      return {
        plan: buildStaticQueryPlan(query, selectedSources, "static-source-routed"),
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
      });
      return { plan, callsAttempted };
    } catch (repairError) {
      return {
        plan: buildStaticQueryPlan(query, selectedSources, "static-source-routed"),
        callsAttempted,
        failureReason: `Query expansion failed after repair: ${repairError}`,
      };
    }
  }
}

export function buildStaticQueryPlan(
  query: string,
  selectedSources: SignalSource[],
  strategy: QueryPlan["strategy"] = "static-source-routed"
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

  return validateQueryPlan(
    {
      originalQuery: query,
      strategy,
      sourceQueries,
      rationale: [
        "Static source-routed fallback uses issue language for GitHub, category language for Hacker News, and frustration language for Reddit.",
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
}: {
  query: string;
  selectedSources: SignalSource[];
  repairInput: string | null;
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
            constraints: [
              "GitHub queries should use issue/failure language.",
              "Hacker News queries should use market/category language.",
              "Reddit queries should use frustration/workaround language.",
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
      return validateQueryPlan(parsed, query, selectedSources, "llm-source-routed");
    });
}

export function validateQueryPlan(
  input: unknown,
  originalQuery: string,
  selectedSources: SignalSource[],
  forcedStrategy?: QueryPlan["strategy"]
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

  return {
    originalQuery,
    strategy: forcedStrategy ?? parsed.strategy,
    sourceQueries,
    rationale: parsed.rationale
      .filter((item) => typeof item === "string")
      .slice(0, 5),
  };
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
