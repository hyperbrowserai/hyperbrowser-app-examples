export interface GenerateRequest {
  topic?: string;
  url?: string;
}

export interface GenerateResponse {
  content: string;
  sources: string[];
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
