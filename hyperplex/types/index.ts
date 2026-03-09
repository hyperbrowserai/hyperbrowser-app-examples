export type TaskStatus = "queued" | "running" | "completed" | "failed";
export type SubagentStatus = "running" | "completed" | "failed";

export interface Subagent {
  id: string;
  runId: string;
  task: string;
  model: string;
  status: SubagentStatus;
  output?: string | null;
  error?: string | null;
  startedAt: string;
  finishedAt?: string | null;
}
export type StepType = "search" | "fetch" | "synthesize";
export type StepStatus = "queued" | "running" | "completed" | "failed";
export type RunStatus = "queued" | "running" | "completed" | "failed";

export interface Step {
  id: string;
  runId: string;
  type: StepType;
  status: StepStatus;
  inputJson?: string | null;
  outputJson?: string | null;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface Source {
  id: string;
  runId: string;
  url: string;
  title?: string | null;
  snippet?: string | null;
  rawMarkdown?: string | null;
  screenshotBase64?: string | null;
  retrievedAt: string;
}

export interface Citation {
  url: string;
  title: string;
  quote: string;
}

export interface ParsedOutput {
  answer: string;
  citations: Citation[];
}

export interface Run {
  id: string;
  taskId: string;
  goal?: string | null;
  status: RunStatus;
  model?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  output?: string | null;
  steps: Step[];
  sources: Source[];
  subagents: Subagent[];
}

export interface RunSummary {
  id: string;
  goal?: string | null;
  status: RunStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface Task {
  id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  model: string;
  scheduleCron?: string | null;
  createdAt: string;
  updatedAt: string;
  runs: RunSummary[];
}

export interface TaskWithRuns {
  id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  model: string;
  scheduleCron?: string | null;
  createdAt: string;
  updatedAt: string;
  runs: Run[];
}
