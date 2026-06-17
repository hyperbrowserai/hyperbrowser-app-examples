// Event types streamed from the agent loop to the frontend over SSE.

export type RunStatus = "booting" | "running" | "done" | "error";

export interface TerminalEvent {
  type: "terminal";
  command?: string;
  stream: "stdout" | "stderr" | "system";
  data: string;
}

export interface FileEvent {
  type: "file";
  path: string;
  contents: string;
}

export interface BrowserEvent {
  type: "browser";
  url: string;
  instruction: string;
  text: string;
  screenshot?: string;
}

export interface PreviewEvent {
  type: "preview";
  url: string;
  port: number;
}

export interface StatusEvent {
  type: "status";
  status: RunStatus;
  bootMs?: number;
  image?: string;
  sandboxId?: string;
}

export interface ThinkingEvent {
  type: "thinking";
  text: string;
}

export interface DoneEvent {
  type: "done";
  summary: string;
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

export type AgentEvent =
  | TerminalEvent
  | FileEvent
  | BrowserEvent
  | PreviewEvent
  | StatusEvent
  | ThinkingEvent
  | DoneEvent
  | ErrorEvent;

export interface RunRecord {
  id: string;
  task: string;
  status: RunStatus;
  sandboxId: string | null;
  image: string;
  bootMs: number | null;
  createdAt: number;
  events: AgentEvent[];
  liveUrl: string | null;
  summary: string | null;
  error: string | null;
}
