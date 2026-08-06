export function isLLMTransportError(error: unknown): boolean {
  const message = String(error).toLowerCase();

  return [
    "timed out",
    "timeout",
    "connection error",
    "connect eacces",
    "fetch failed",
    "network",
    "rate limit",
    "too many requests",
  ].some((term) => message.includes(term));
}
