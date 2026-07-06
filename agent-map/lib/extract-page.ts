import type { Hyperbrowser } from "@hyperbrowser/sdk";

import type { PageSummary } from "./types";

export const pageSummarySchema = {
  type: "object",
  properties: {
    purpose: { type: "string" },
    keyActions: {
      type: "array",
      items: { type: "string" },
    },
    primaryData: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["purpose", "keyActions", "primaryData"],
  additionalProperties: false,
} as const;

export async function extractPageSummary(
  client: Hyperbrowser,
  url: string,
): Promise<PageSummary> {
  const extractResult = await client.extract.startAndWait({
    urls: [url],
    prompt:
      "Extract a concise, agent-ready summary of this page. Describe the page purpose, important actions a user or agent can take, and the primary factual data or content exposed on the page.",
    schema: pageSummarySchema,
  });

  if (extractResult.status === "failed") {
    throw new Error(extractResult.error ?? "Hyperbrowser extract failed");
  }

  return normalizeSummary(extractResult.data);
}

function normalizeSummary(value: unknown): PageSummary {
  const data = isRecord(value) ? value : {};

  return {
    purpose: typeof data.purpose === "string" ? data.purpose : "",
    keyActions: toStringArray(data.keyActions),
    primaryData: toStringArray(data.primaryData),
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
