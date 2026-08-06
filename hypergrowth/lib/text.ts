const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "you",
  "are",
  "but",
  "have",
  "has",
  "was",
  "were",
  "will",
  "would",
  "can",
  "not",
  "our",
  "your",
  "its",
  "into",
  "about",
  "when",
  "where",
  "what",
  "how",
  "why",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9+#.-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function countMatches(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  return terms.reduce((count, term) => count + (lower.includes(term) ? 1 : 0), 0);
}

export function matchedTerms(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term));
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function roundScore(value: number): number {
  return Math.round(clamp01(value) * 1000) / 1000;
}

export function jaccardSimilarity(a: string, b: string): number {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));

  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }

  const union = new Set([...left, ...right]).size;
  return intersection / union;
}
