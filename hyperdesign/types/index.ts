export interface DesignTokens {
  name?: string;
  colors?: Record<string, unknown>;
  typography?: Record<string, unknown>;
  rounded?: Record<string, unknown>;
  spacing?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PageCopy {
  heading: string;
  body: string;
}

export interface GenerateApiResponse {
  designMd: string;
  tokens: DesignTokens | null;
  screenshot: string;
  pageCopy?: PageCopy;
  error?: string;
}
