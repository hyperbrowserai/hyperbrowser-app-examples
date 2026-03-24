export interface DiscoveryNode {
  id: string;
  url: string;
  title: string;
  timestamp: number;
}

export interface SkillTreeFile {
  path: string;
  content: string;
}

export interface SkillTreeResult {
  topic: string;
  files: SkillTreeFile[];
}

export interface ConceptData {
  name: string;
  description: string;
  codeExamples?: string[];
  relatedConcepts: string[];
}

export type BrowseEvent =
  | { type: "session_started"; liveUrl: string }
  | { type: "navigating"; url: string }
  | { type: "extracting"; url: string; pageTitle: string }
  | { type: "content_extracted"; concepts: ConceptData[] }
  | { type: "generating_skills" }
  | { type: "skill_generated"; file: SkillTreeFile }
  | { type: "complete"; tree: SkillTreeResult }
  | { type: "error"; message: string };

export type GenerationStatus =
  | "idle"
  | "browsing"
  | "generating"
  | "complete"
  | "error";
