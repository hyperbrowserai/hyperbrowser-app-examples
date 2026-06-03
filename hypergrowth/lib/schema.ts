import { z } from "zod";

export const signalSourceSchema = z.enum([
  "hackernews",
  "github",
  "hyperbrowser",
]);
export const analysisModeSchema = z.enum([
  "deterministic",
  "lean",
  "balanced",
  "full",
]);

export const defaultRedditSubreddits = [
  "webscraping",
  "playwright",
  "puppeteer",
  "automation",
  "webdev",
] as const;

const subredditSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^r\//i, ""))
  .pipe(
    z
      .string()
      .min(2)
      .max(24)
      .regex(/^[A-Za-z0-9_]+$/)
  );

export const openWebTargetsSchema = z
  .object({
    includeBroadWeb: z.boolean().default(true),
    redditSubreddits: z
      .array(subredditSchema)
      .max(8)
      .default([...defaultRedditSubreddits]),
  })
  .default({
    includeBroadWeb: true,
    redditSubreddits: [...defaultRedditSubreddits],
  })
  .transform((targets) => ({
    includeBroadWeb: targets.includeBroadWeb,
    redditSubreddits: Array.from(
      new Set(targets.redditSubreddits.map((subreddit) => subreddit.trim()))
    ),
  }));

export const mineRequestSchema = z.object({
  query: z.string().trim().min(3, "Enter a topic with at least 3 characters."),
  sources: z
    .array(signalSourceSchema)
    .min(1, "Select at least one source.")
    .default(["hackernews", "github", "hyperbrowser"]),
  maxResults: z.coerce.number().int().min(3).max(30).default(12),
  analysisMode: analysisModeSchema.default("balanced"),
  openWebTargets: openWebTargetsSchema,
});
