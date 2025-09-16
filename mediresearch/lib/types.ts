import { z } from 'zod';

// Blood test result schema
export const BloodTestSchema = z.object({
  name: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string(),
  refRange: z.string(),
  status: z.enum(['normal', 'high', 'low', 'critical']).optional(),
});

export type BloodTest = z.infer<typeof BloodTestSchema>;

// Research article schema
export const ResearchArticleSchema = z.object({
  title: z.string(),
  summary: z.string(),
  link: z.string().url(),
  source: z.string(),
});

export type ResearchArticle = z.infer<typeof ResearchArticleSchema>;

// Analysis insight schema
export const AnalysisInsightSchema = z.object({
  test: z.string(),
  status: z.enum(['normal', 'high', 'low', 'critical']),
  comparison: z.string(),
  message: z.string(),
  sources: z.array(z.string()),
  recommendations: z.array(z.string()).optional(),
});

export type AnalysisInsight = z.infer<typeof AnalysisInsightSchema>;

// API request/response schemas
export const FetchResultsRequestSchema = z.object({
  file: z.string(), // base64 encoded file or file path
  fileType: z.enum(['pdf', 'html', 'csv', 'txt']),
});

export const FetchResultsResponseSchema = z.object({
  tests: z.array(BloodTestSchema),
  evidence: z.object({
    md: z.string(),
    sources: z.array(z.string()),
  }),
  runId: z.string(),
});

export const FetchResearchRequestSchema = z.object({
  testName: z.string(),
  testValue: z.union([z.string(), z.number()]).optional(),
});

export const FetchResearchResponseSchema = z.object({
  articles: z.array(ResearchArticleSchema),
  runId: z.string(),
});

export const AnalyzeRequestSchema = z.object({
  results: z.array(BloodTestSchema),
  research: z.array(ResearchArticleSchema),
});

export const AnalyzeResponseSchema = z.object({
  insights: z.array(AnalysisInsightSchema),
  summary: z.string(),
  runId: z.string(),
});

// Export types
export type FetchResultsRequest = z.infer<typeof FetchResultsRequestSchema>;
export type FetchResultsResponse = z.infer<typeof FetchResultsResponseSchema>;
export type FetchResearchRequest = z.infer<typeof FetchResearchRequestSchema>;
export type FetchResearchResponse = z.infer<typeof FetchResearchResponseSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

