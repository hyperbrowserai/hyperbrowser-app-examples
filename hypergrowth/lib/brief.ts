import type { GrowthBrief, GrowthPlay, PainCluster, PainSignal } from "./types";

export function buildGrowthBrief({
  query,
  clusters,
  growthPlays,
  signals,
  generatedAt = new Date().toISOString(),
}: {
  query: string;
  clusters: PainCluster[];
  growthPlays: GrowthPlay[];
  signals: PainSignal[];
  generatedAt?: string;
}): GrowthBrief {
  const topCluster = clusters[0];
  const topPlay = growthPlays[0];
  const topFinding = topCluster
    ? `${topCluster.title} is the strongest detected growth signal, backed by ${topCluster.frequency} evidence item${
        topCluster.frequency === 1 ? "" : "s"
      } across ${topCluster.sourceDiversity ?? 1} source type${
        (topCluster.sourceDiversity ?? 1) === 1 ? "" : "s"
      }.`
    : "No strong pain cluster was detected.";

  return {
    query,
    executiveSummary: topPlay
      ? `HyperGrowth found ${clusters.length} pain cluster${
          clusters.length === 1 ? "" : "s"
        } and recommends starting with "${topPlay.title}" because it has the highest expected growth value.`
      : "HyperGrowth did not find enough evidence to recommend a growth play.",
    topFinding,
    topClusters: clusters.slice(0, 5),
    recommendedPlays: growthPlays.slice(0, 5),
    evidence: signals.slice(0, 20),
    caveats: buildCaveats(signals),
    generatedAt,
  };
}

export function renderMarkdownBrief(brief: GrowthBrief): string {
  const lines = [
    `# HyperGrowth Brief: ${brief.query}`,
    "",
    "## Top Finding",
    brief.topFinding,
    "",
    "## Executive Summary",
    brief.executiveSummary,
    "",
    "## Recommended Growth Plays",
    ...brief.recommendedPlays.flatMap((play) => [
      `### ${play.title}`,
      `- Channel: ${play.channel}`,
      `- Expected value: ${play.score?.expectedValue ?? "n/a"}`,
      `- Action: ${play.recommendedAction}`,
      `- Draft: ${play.copyDraft}`,
      `- Evidence: ${play.supportingSignalIds.join(", ")}`,
      "",
    ]),
    "## Evidence",
    ...brief.evidence.map(
      (signal) =>
        `- [${signal.id}] ${signal.source}: "${signal.quote}" (${signal.url})`
    ),
    "",
    "## Caveats",
    ...brief.caveats.map((caveat) => `- ${caveat}`),
  ];

  return lines.join("\n");
}

function buildCaveats(signals: PainSignal[]): string[] {
  const caveats: string[] = [];

  if (signals.length < 5) {
    caveats.push("Small evidence set; validate with additional queries before launching a major campaign.");
  }

  if (new Set(signals.map((signal) => signal.source)).size === 1) {
    caveats.push("Signals come from one source type; source-diverse confirmation would increase confidence.");
  }

  if (signals.some((signal) => !signal.publishedAt)) {
    caveats.push("Some sources did not expose timestamps, so recency confidence is approximate.");
  }

  return caveats.length ? caveats : ["Evidence is still directional and should be validated before high-cost execution."];
}
