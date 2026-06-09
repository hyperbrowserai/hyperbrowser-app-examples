import { Hyperbrowser } from "@hyperbrowser/sdk";

let cached: Hyperbrowser | null = null;

export function getHyperbrowser(): Hyperbrowser {
  if (cached) return cached;
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not set");
  }
  cached = new Hyperbrowser({ apiKey });
  return cached;
}
