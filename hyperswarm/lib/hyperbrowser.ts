import { Hyperbrowser } from "@hyperbrowser/sdk";

let client: Hyperbrowser | null = null;

export function getHyperbrowser(): Hyperbrowser {
  if (!process.env.HYPERBROWSER_API_KEY) {
    throw new Error("HYPERBROWSER_API_KEY is not set");
  }
  if (!client) {
    client = new Hyperbrowser({
      apiKey: process.env.HYPERBROWSER_API_KEY,
    });
  }
  return client;
}
