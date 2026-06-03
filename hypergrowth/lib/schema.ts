import { z } from "zod";

export const signalSourceSchema = z.enum(["hackernews", "github", "reddit"]);
export const analysisModeSchema = z.enum([
  "deterministic",
  "lean",
  "balanced",
  "full",
]);

export const mineRequestSchema = z.object({
  query: z.string().trim().min(3, "Enter a topic with at least 3 characters."),
  sources: z
    .array(signalSourceSchema)
    .min(1, "Select at least one source.")
    .default(["hackernews", "github", "reddit"]),
  maxResults: z.coerce.number().int().min(3).max(30).default(12),
  analysisMode: analysisModeSchema.default("balanced"),
});
