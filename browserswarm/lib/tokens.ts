/**
 * Cheap, deterministic token estimate (~4 chars/token). Always labeled "(est)"
 * in the UI — we never claim these are exact tokenizer counts.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
