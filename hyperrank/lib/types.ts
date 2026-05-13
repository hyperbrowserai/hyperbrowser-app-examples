export type EngineKey = "chatgpt" | "claude" | "perplexity" | "google";

export type EngineQueryStatus = "ok" | "failed" | "unavailable";

export interface EngineQueryResult {
  engine: EngineKey;
  prompt: string;
  markdown: string;
  status: EngineQueryStatus;
  error?: string;
}

export interface PromptPlan {
  companyName: string;
  category: string;
  description: string;
  competitors: string[];
  prompts: string[];
}

export type Sentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "not_mentioned"
  | "unavailable";

export interface EngineScore {
  score: number | null;
  mentionRate: string;
  sentiment: Sentiment;
}

export interface CompetitorComparison {
  name: string;
  mentionCount: number;
  isRecommendedOver: boolean;
}

export interface PromptLost {
  prompt: string;
  engine: EngineKey;
  competitorMentioned: string;
  reason: string;
}

export interface Scorecard {
  overallScore: number;
  companyName: string;
  category: string;
  description: string;
  summary: string;
  engineScores: Record<EngineKey, EngineScore>;
  competitorComparison: CompetitorComparison[];
  promptsLost: PromptLost[];
  citationSources: string[];
  inaccuracies: string[];
  generatedAt: string;
  inputUrl: string;
}

export type SseEvent =
  | { type: "step"; id: 1 | 2 | 3 | 4 | 5; label: string }
  | {
      type: "engine_progress";
      engine: EngineKey;
      completed: number;
      total: number;
    }
  | { type: "done"; scorecard: Scorecard }
  | { type: "error"; message: string; recoverable: boolean };
