export type ScanStatus =
  | "cloning"
  | "installing"
  | "analyzing"
  | "testing"
  | "generating"
  | "scoring"
  | "complete"
  | "error";

export interface Failure {
  what_went_wrong: string;
  wrong_assumption: string;
  actual_truth: string;
  affected_files: string[];
  fix: string;
}

export interface TaskResult {
  task: string;
  succeeded: boolean;
  steps_taken: string[];
  failures: Failure[];
  commands_that_failed: string[];
  /** Raw text if the JSON report could not be parsed. */
  raw?: string;
  parseError?: boolean;
}

export interface ScoreBreakdown {
  discovery: number;
  specificity: number;
  testability: number;
  documentation: number;
  structure: number;
}

export interface ScoreData {
  score: number;
  breakdown: ScoreBreakdown;
  verdict: string;
  topIssues: string[];
}

export interface HarnessResults {
  claudeMd: string;
  agentsMd: string;
  score: ScoreData;
  failures: TaskResult[];
}

export interface TerminalEntry {
  /** The command as the agent typed it (no `cd` prefix). */
  command: string;
  /** Combined stdout + stderr, truncated for transport. */
  output: string;
  exitCode: number | null;
  /** 0 = setup phase, 1..6 = which test task produced this command. */
  taskIndex: number;
  /** Still running (no output yet). */
  running?: boolean;
}

export interface Scan {
  repoUrl: string;
  sandboxId: string;
  status: ScanStatus;
  /** Which test task is currently running, 1..6 (0 before testing starts). */
  currentTask: number;
  totalTasks: number;
  failures: TaskResult[];
  results: HarnessResults | null;
  /** Most recent sandbox command, for the live status line. */
  lastCommand?: string;
  /** Rolling live terminal of commands the agent actually ran in the sandbox. */
  terminal: TerminalEntry[];
  error?: string;
}
