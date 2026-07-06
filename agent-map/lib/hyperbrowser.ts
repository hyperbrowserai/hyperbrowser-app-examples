import { Hyperbrowser } from "@hyperbrowser/sdk";

export function getHyperbrowserClient() {
  const apiKey = process.env.HYPERBROWSER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing HYPERBROWSER_API_KEY in .env.local");
  }

  return new Hyperbrowser({ apiKey });
}
