export interface GenerateRequest {
  topic?: string;
  url?: string;
}

export interface GenerateResponse {
  content: string;
  sources: string[];
  screenshots?: string[];
  metadata: {
    topic: string;
    scrapedCount: number;
    generatedAt: string;
  };
  error?: string;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export interface ScrapedContent {
  url: string;
  markdown: string;
  success: boolean;
  error?: string;
}

export interface BatchResult {
  url: string;
  content?: string;
  status: "pending" | "processing" | "success" | "error";
  success?: boolean;
  error?: string;
  duration?: number;
}

export interface SkillTreeFile {
  path: string;
  content: string;
}

export interface SkillTreeResult {
  topic: string;
  files: SkillTreeFile[];
}

/** Server-sent events for POST /api/skill-tree */
export type SkillTreeStreamEvent =
  | { type: "phase"; phase: "searching" | "browsing" | "generating" }
  | { type: "session_started"; liveUrl: string }
  | { type: "sources"; urls: string[] }
  | { type: "navigating"; url: string }
  | { type: "extracting"; url: string; pageTitle: string }
  | { type: "agent_status"; message: string }
  | { type: "tree_topic"; topic: string }
  | { type: "skill_generated"; file: SkillTreeFile }
  | { type: "complete"; tree: SkillTreeResult }
  | { type: "error"; message: string };

export type AutoModePhase = "idle" | "searching" | "browsing" | "generating" | "complete" | "error";

export interface AutoDiscoveryNode {
  id: string;
  url: string;
  title: string;
  timestamp: number;
}

/** Server-sent events for POST /api/auto-mode */
export type AutoModeStreamEvent =
  | { type: "run_started"; runId: string }
  | { type: "phase"; phase: Exclude<AutoModePhase, "idle"> }
  | { type: "session_started"; liveUrl: string }
  | { type: "search_complete"; urls: string[] }
  | { type: "navigating"; url: string }
  | { type: "extracting"; url: string; pageTitle: string }
  | { type: "agent_status"; message: string }
  | { type: "skill_tree_topic"; topic: string }
  | { type: "skill_file"; file: SkillTreeFile }
  | { type: "complete"; tree: SkillTreeResult }
  | { type: "stopped_early"; message: string }
  | { type: "error"; message: string };
