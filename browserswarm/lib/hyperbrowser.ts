import { Hyperbrowser } from "@hyperbrowser/sdk";

// Salvaged from the previous app's working SDK setup. Server-side only —
// the key never reaches the client.
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
