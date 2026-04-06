import type { BrowserUseLlm } from "@hyperbrowser/sdk/types";

export type SubTask = {
  task: string;
  url: string;
  extractionGoal: string;
  siteName: string;
};

export type AgentResult = {
  subtaskIndex: number;
  siteName: string;
  result: string | null;
  status: "completed" | "failed" | "stopped";
  error?: string;
};

export type RawAgentSnippet = {
  subtaskIndex: number;
  siteName: string;
  text: string;
};

export type RankedResult = {
  rank: number;
  title: string;
  keyData: string;
  sources: string[];
  summary: string;
};

export type SwarmSynthesis = {
  headline: string;
  recommendation: string;
  agentsCount: number;
  sitesVisited: number;
  resultsCount: number;
  durationMs: number;
};

export type SwarmEvent =
  | { type: "subtasks_ready"; subtasks: SubTask[] }
  | {
      type: "agent_launched";
      index: number;
      siteName: string;
      liveUrl: string;
      jobId: string;
    }
  | { type: "agent_live_refresh"; index: number; liveUrl: string }
  | {
      type: "agent_final_frame";
      index: number;
      /** data: URL or https image URL from last step screenshot */
      frameSrc?: string;
      /** Last page URL the agent had open, for context when live/embed fails */
      lastPageUrl?: string;
    }
  | {
      type: "agent_progress";
      index: number;
      status: string;
      progress: number;
    }
  | { type: "agent_result"; index: number; result: AgentResult }
  | { type: "agent_complete"; index: number }
  | { type: "agent_failed"; index: number; error: string }
  | { type: "result_ranked"; rankedResults: RankedResult[]; duplicatesRemoved: number }
  | { type: "synthesizing" }
  | {
      type: "complete";
      synthesis: SwarmSynthesis;
      rankedResults: RankedResult[];
    }
  | { type: "error"; message: string };

export type SwarmConfigPayload = {
  goal: string;
  subtasks: SubTask[];
  maxAgents: number;
  maxSteps: number;
  timeoutSeconds: number;
  useStealth: boolean;
  useProxy: boolean;
  solveCaptchas: boolean;
  agentLlm: BrowserUseLlm;
  useCustomApiKeys?: boolean;
};

export function sseData(event: SwarmEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
