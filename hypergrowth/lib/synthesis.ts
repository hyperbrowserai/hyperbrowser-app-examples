import OpenAI from "openai";
import type { GrowthPlay, MineResult, PainCluster, PainSignal } from "./types";

type Synthesis = Pick<
  MineResult,
  "clusters" | "growthPlays" | "outboundDrafts" | "contentAngles"
>;

export async function synthesizeSignals(
  query: string,
  signals: PainSignal[]
): Promise<Synthesis> {
  if (!process.env.OPENAI_API_KEY) {
    return synthesizeHeuristically(signals);
  }

  try {
    return await synthesizeWithOpenAI(query, signals);
  } catch {
    return synthesizeHeuristically(signals);
  }
}

export function synthesizeHeuristically(signals: PainSignal[]): Synthesis {
  const clusterMap = new Map<string, PainSignal[]>();

  for (const signal of signals) {
    const existing = clusterMap.get(signal.painCategory) ?? [];
    existing.push(signal);
    clusterMap.set(signal.painCategory, existing);
  }

  const clusters: PainCluster[] = Array.from(clusterMap.entries()).map(
    ([category, categorySignals], index) => ({
      id: `cluster-${index + 1}`,
      title: titleCase(category),
      summary: `Developers are repeatedly surfacing ${category} while trying to automate or extract web data.`,
      frequency: categorySignals.length,
      urgency: categorySignals.some((signal) => signal.urgency === "high")
        ? "high"
        : categorySignals.some((signal) => signal.urgency === "medium")
          ? "medium"
          : "low",
      representativeQuotes: categorySignals
        .slice(0, 3)
        .map((signal) => signal.quote),
      relatedTools: Array.from(
        new Set(categorySignals.flatMap((signal) => signal.toolsMentioned))
      ).slice(0, 6),
      signalIds: categorySignals.map((signal) => signal.id),
    })
  );

  const growthPlays: GrowthPlay[] = clusters.slice(0, 4).map((cluster, index) => ({
    id: `play-${index + 1}`,
    channel: index % 2 === 0 ? "content" : "outbound",
    title: `Turn "${cluster.title}" into a growth experiment`,
    insight: cluster.summary,
    recommendedAction:
      index % 2 === 0
        ? "Publish a technical teardown that names the failure mode and shows how managed browser infrastructure removes it."
        : "Build a small outbound segment around teams publicly discussing this failure mode.",
    copyDraft:
      index % 2 === 0
        ? "Your browser automation does not fail in demos. It fails on the real web."
        : `Saw your team discussing ${cluster.title.toLowerCase()}. Hyperbrowser is built to make that browser layer reliable without owning the fleet.`,
    supportingSignalIds: cluster.signalIds,
  }));

  return {
    clusters,
    growthPlays,
    outboundDrafts: growthPlays
      .filter((play) => play.channel === "outbound")
      .map((play) => play.copyDraft),
    contentAngles: growthPlays
      .filter((play) => play.channel === "content")
      .map((play) => play.title),
  };
}

async function synthesizeWithOpenAI(
  query: string,
  signals: PainSignal[]
): Promise<Synthesis> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a growth engineer for a developer-tools company. Cluster evidence into concrete GTM plays. Use only the provided signals. Return valid JSON.",
      },
      {
        role: "user",
        content: JSON.stringify({
          query,
          requiredShape: {
            clusters:
              "PainCluster[] with id,title,summary,frequency,urgency,representativeQuotes,relatedTools,signalIds",
            growthPlays:
              "GrowthPlay[] with id,channel,title,insight,recommendedAction,copyDraft,supportingSignalIds",
            outboundDrafts: "string[]",
            contentAngles: "string[]",
          },
          signals,
        }),
      },
    ],
  });

  const raw = response.choices[0]?.message.content;
  if (!raw) throw new Error("OpenAI returned an empty response.");

  const parsed = JSON.parse(raw) as Partial<Synthesis>;

  return {
    clusters: Array.isArray(parsed.clusters) ? parsed.clusters : [],
    growthPlays: Array.isArray(parsed.growthPlays) ? parsed.growthPlays : [],
    outboundDrafts: Array.isArray(parsed.outboundDrafts)
      ? parsed.outboundDrafts
      : [],
    contentAngles: Array.isArray(parsed.contentAngles)
      ? parsed.contentAngles
      : [],
  };
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
