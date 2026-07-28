import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

/** Create the server-side Anthropic client. */
export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  cached = new Anthropic({ apiKey, maxRetries: 0 });
  return cached;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retry standard rate limits and transient provider errors with jitter. */
export async function withProviderRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseMs?: number;
    onRetry?: (attempt: number, waitMs: number) => void;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 4;
  const baseMs = options.baseMs ?? 750;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      const retryable = status === 429 || status === 529 || (typeof status === "number" && status >= 500);
      if (!retryable || attempt === maxAttempts - 1) throw error;

      const ceiling = Math.min(8_000, baseMs * 2 ** attempt);
      const waitMs = Math.floor(ceiling / 2 + Math.random() * ceiling);
      options.onRetry?.(attempt + 1, waitMs);
      await sleep(waitMs);
    }
  }

  throw lastError;
}
