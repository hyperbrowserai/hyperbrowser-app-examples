import { Hyperbrowser } from '@hyperbrowser/sdk';

// Only initialize if API key is available (for build time)
export const hyperbrowser = process.env.HYPERBROWSER_API_KEY 
  ? new Hyperbrowser({
      apiKey: process.env.HYPERBROWSER_API_KEY,
    })
  : null;

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

// Utility function for exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = RETRY_CONFIG.maxRetries
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, RETRY_CONFIG.maxRetries - retries),
      RETRY_CONFIG.maxDelay
    );
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1);
  }
}
