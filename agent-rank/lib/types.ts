export type AgentName = "claude" | "openai" | "gemini";

export type AgentStatus = "running" | "completed" | "failed";

export interface AgentRuntimeResult {
  status: AgentStatus;
  output?: string;
  steps?: number;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface SessionInfo {
  id: string;
  liveViewUrl: string | null;
}

export interface AgentJudgeResult {
  passed: boolean;
  steps: number;
  summary: string;
}

export interface ScoreIssue {
  severity: "critical" | "warning" | "info";
  label: string;
  detail: string;
  fix: string;
}

export interface Scorecard {
  score: number;
  verdict: string;
  agents: Record<AgentName, AgentJudgeResult>;
  issues: ScoreIssue[];
  recommendations: string[];
}

export interface Scan {
  id: string;
  url: string;
  task: string;
  sessions: Record<AgentName, SessionInfo>;
  results: Partial<Record<AgentName, AgentRuntimeResult>>;
  status: "running" | "judging" | "complete" | "error";
  scorecard?: Scorecard;
  error?: string;
  createdAt: number;
}

export const AGENT_LABELS: Record<AgentName, string> = {
  claude: "CLAUDE",
  openai: "GPT",
  gemini: "GEMINI",
};

export const AGENT_ORDER: AgentName[] = ["claude", "openai", "gemini"];
