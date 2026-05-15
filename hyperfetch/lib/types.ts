export type FactCategory =
  | "pricing"
  | "feature"
  | "statistic"
  | "announcement"
  | "definition"
  | "comparison";

export type ContentType =
  | "documentation"
  | "blog"
  | "landing"
  | "pricing"
  | "api-reference"
  | "news"
  | "other";

export interface KeyFact {
  fact: string;
  category: FactCategory;
}

export interface ExtractedTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ExtractedCode {
  language: string;
  code: string;
  description: string;
}

export interface ExtractedStat {
  label: string;
  value: string;
  context: string;
}

export interface ExtractedEntities {
  companies: string[];
  people: string[];
  products: string[];
  technologies: string[];
}

export interface ExtractedLinks {
  docs: string[];
  social: string[];
  pricing: string[];
  other: string[];
}

export interface EnrichedResult {
  title: string;
  description: string;
  summary: string;
  keyFacts: KeyFact[];
  tables: ExtractedTable[];
  codeBlocks: ExtractedCode[];
  stats: ExtractedStat[];
  entities: ExtractedEntities;
  links: ExtractedLinks;
  lastUpdated: string | null;
  author: string | null;
  contentType: ContentType;
  sourceUrl: string;
}

export type StreamEvent =
  | { step: 1; message: string }
  | { step: 2; message: string }
  | { step: 3; message: string }
  | { step: 4; message: string; result: EnrichedResult }
  | { step: -1; message: string; error: string };
