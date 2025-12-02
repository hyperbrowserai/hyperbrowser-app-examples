// Research types
export interface ResearchResult {
  url: string;
  title?: string;
  content: string;
  metadata?: {
    description?: string;
  };
  error?: boolean;
}

export interface ComparisonData {
  category: string;
  items: {
    name: string;
    value: string | number;
  }[];
}

export interface SourceScore {
  name: string;
  scores: {
    pricing: number;
    features: number;
    ease_of_use: number;
    performance: number;
    support: number;
  };
  overall: number;
}

export interface ResearchResponse {
  synthesis: string;
  comparisons: ComparisonData[];
  results: ResearchResult[];
  scores?: SourceScore[];
}
