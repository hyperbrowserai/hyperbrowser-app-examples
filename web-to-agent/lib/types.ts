import { z } from 'zod';

// Zod schemas for validation
export const CrawlRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

export const DOMElementSchema = z.object({
  type: z.enum(['button', 'input', 'select', 'textarea', 'form', 'link', 'table']),
  selector: z.string(),
  text: z.string().optional(),
  attributes: z.record(z.string()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
});

export const CrawlResultSchema = z.object({
  url: z.string(),
  title: z.string(),
  elements: z.array(DOMElementSchema),
  screenshot: z.string().optional(),
  html: z.string(),
  timestamp: z.string(),
});

export const ActionSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.any()),
  selector: z.string().optional(),
  type: z.enum(['click', 'fill', 'select', 'extract', 'navigate']),
});

export const MapRequestSchema = z.object({
  domJson: CrawlResultSchema,
});

export const MapResultSchema = z.object({
  actions: z.array(ActionSchema),
});

export const ScaffoldRequestSchema = z.object({
  actions: z.array(ActionSchema),
  url: z.string(),
});

export const GeneratedToolSchema = z.object({
  name: z.string(),
  code: z.string(),
  schema: z.record(z.any()),
});

export const ScaffoldResultSchema = z.object({
  tools: z.array(GeneratedToolSchema),
  typescript: z.string(),
});

export const TestRequestSchema = z.object({
  action: ActionSchema,
  input: z.record(z.any()),
  url: z.string(),
});

export const TestResultSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  screenshot: z.string().optional(),
  logs: z.array(z.string()),
});

// TypeScript types inferred from schemas
export type CrawlRequest = z.infer<typeof CrawlRequestSchema>;
export type DOMElement = z.infer<typeof DOMElementSchema>;
export type CrawlResult = z.infer<typeof CrawlResultSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type MapRequest = z.infer<typeof MapRequestSchema>;
export type MapResult = z.infer<typeof MapResultSchema>;
export type ScaffoldRequest = z.infer<typeof ScaffoldRequestSchema>;
export type GeneratedTool = z.infer<typeof GeneratedToolSchema>;
export type ScaffoldResult = z.infer<typeof ScaffoldResultSchema>;
export type TestRequest = z.infer<typeof TestRequestSchema>;
export type TestResult = z.infer<typeof TestResultSchema>;

// API Response wrapper
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
