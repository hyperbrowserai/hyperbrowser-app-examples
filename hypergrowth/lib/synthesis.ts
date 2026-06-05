import { extractJsonObject } from "./json-utils";
import { getLLMClient, withReasoningEffort } from "./llm/provider";
import type {
  GrowthPlay,
  MinePipelineResult,
  PainCluster,
  PainSignal,
  SignalScore,
} from "./types";

type SynthesisInput = {
  query: string;
  signals: PainSignal[];
  signalScores: SignalScore[];
  clusters: PainCluster[];
  candidatePlays: GrowthPlay[];
};

type Synthesis = Pick<
  MinePipelineResult,
  "clusters" | "growthPlays" | "outboundDrafts" | "contentAngles"
>;

export async function synthesizeSignals(
  input: SynthesisInput,
  options: { allowLLM: boolean } = { allowLLM: false }
): Promise<Synthesis & { callsAttempted: number; mode: "disabled" | "used" | "fallback" | "deterministic"; failureReason?: string }> {
  if (!options.allowLLM) {
    return {
      ...synthesizeDeterministically(input.clusters, input.candidatePlays),
      callsAttempted: 0,
      mode: "deterministic",
    };
  }

  if (!getLLMClient()) {
    return {
      ...synthesizeDeterministically(input.clusters, input.candidatePlays),
      callsAttempted: 0,
      mode: "fallback",
      failureReason: "No LLM provider configured for synthesis.",
    };
  }

  try {
    return {
      ...(await synthesizeWithLLM(input)),
      callsAttempted: 1,
      mode: "used",
    };
  } catch (error) {
    return {
      ...synthesizeDeterministically(input.clusters, input.candidatePlays),
      callsAttempted: 1,
      mode: "fallback",
      failureReason: `LLM synthesis failed: ${error}`,
    };
  }
}

export function synthesizeDeterministically(
  clusters: PainCluster[],
  candidatePlays: GrowthPlay[]
): Synthesis {
  return {
    clusters,
    growthPlays: candidatePlays,
    outboundDrafts: candidatePlays
      .filter((play) => play.channel === "outbound")
      .slice(0, 5)
      .map((play) => play.copyDraft),
    contentAngles: candidatePlays
      .filter((play) => play.channel === "content")
      .slice(0, 5)
      .map((play) => play.title),
  };
}

async function synthesizeWithLLM(input: SynthesisInput): Promise<Synthesis> {
  const llm = getLLMClient();
  if (!llm) throw new Error("No LLM provider configured.");

  const allowedSignalIds = new Set(input.signals.map((signal) => signal.id));
  const response = await llm.client.chat.completions.create(
    withReasoningEffort({
      model: llm.metadata.model ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a growth engineer for a developer-tools company. You refine already-scored evidence into concise growth recommendations. Use only provided evidence. Every cluster and growth play must cite existing signal IDs. Do not invent URLs, quotes, companies, metrics, or sources. Return valid JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            query: input.query,
            constraints: [
              "Keep cluster ids from the provided clusters.",
              "Keep growth play ids from the provided candidate plays.",
              "Every cited signal id must exist in signals.",
              "Do not remove score objects if present.",
              "Prefer concrete actions over generic strategy language.",
            ],
            requiredShape: {
              clusters:
                "PainCluster[] with id,title,summary,frequency,urgency,representativeQuotes,relatedTools,signalIds,sourceDiversity,averagePainIntensity,averageHyperbrowserFit,clusterStrength,confidence",
              growthPlays:
                "GrowthPlay[] with id,channel,title,insight,recommendedAction,copyDraft,supportingSignalIds,score",
              outboundDrafts: "string[]",
              contentAngles: "string[]",
            },
            signals: input.signals,
            signalScores: input.signalScores,
            clusters: input.clusters,
            candidatePlays: input.candidatePlays,
          }),
        },
      ],
    })
  );

  const raw = response.choices[0]?.message.content;
  if (!raw) throw new Error("OpenAI returned an empty response.");

  const parsed = extractJsonObject(raw) as Partial<Synthesis>;
  const clusters = validateClusters(parsed.clusters, input.clusters, allowedSignalIds);
  const growthPlays = validateGrowthPlays(
    parsed.growthPlays,
    input.candidatePlays,
    allowedSignalIds
  );

  return {
    clusters,
    growthPlays,
    outboundDrafts: Array.isArray(parsed.outboundDrafts)
      ? parsed.outboundDrafts.filter((draft) => typeof draft === "string").slice(0, 8)
      : growthPlays
          .filter((play) => play.channel === "outbound")
          .map((play) => play.copyDraft),
    contentAngles: Array.isArray(parsed.contentAngles)
      ? parsed.contentAngles.filter((angle) => typeof angle === "string").slice(0, 8)
      : growthPlays
          .filter((play) => play.channel === "content")
          .map((play) => play.title),
  };
}

function validateClusters(
  proposed: unknown,
  fallback: PainCluster[],
  allowedSignalIds: Set<string>
): PainCluster[] {
  if (!Array.isArray(proposed)) return fallback;

  const byId = new Map(fallback.map((cluster) => [cluster.id, cluster]));

  return proposed
    .map((cluster) => {
      if (typeof cluster !== "object" || cluster === null) return null;

      const record = cluster as Partial<PainCluster>;
      if (!record.id || !byId.has(record.id)) return null;

      const original = byId.get(record.id)!;
      const signalIds = Array.isArray(record.signalIds)
        ? record.signalIds.filter((id): id is string => allowedSignalIds.has(String(id)))
        : original.signalIds;

      if (signalIds.length === 0) return null;

      return {
        ...original,
        ...record,
        signalIds,
        representativeQuotes: Array.isArray(record.representativeQuotes)
          ? record.representativeQuotes.filter(
              (quote): quote is string => typeof quote === "string"
            )
          : original.representativeQuotes,
        relatedTools: Array.isArray(record.relatedTools)
          ? record.relatedTools.filter((tool): tool is string => typeof tool === "string")
          : original.relatedTools,
      };
    })
    .filter((cluster): cluster is PainCluster => Boolean(cluster));
}

function validateGrowthPlays(
  proposed: unknown,
  fallback: GrowthPlay[],
  allowedSignalIds: Set<string>
): GrowthPlay[] {
  if (!Array.isArray(proposed)) return fallback;

  const byId = new Map(fallback.map((play) => [play.id, play]));
  const validPlays: GrowthPlay[] = [];

  for (const play of proposed) {
    if (typeof play !== "object" || play === null) continue;

    const record = play as Partial<GrowthPlay>;
    if (!record.id || !byId.has(record.id)) continue;

    const original = byId.get(record.id)!;
    const supportingSignalIds = Array.isArray(record.supportingSignalIds)
      ? record.supportingSignalIds.filter((id): id is string =>
          allowedSignalIds.has(String(id))
        )
      : original.supportingSignalIds;

    if (supportingSignalIds.length === 0) continue;

    validPlays.push({
      ...original,
      ...record,
      supportingSignalIds,
      score: original.score,
    });
  }

  return validPlays.length ? validPlays : fallback;
}
