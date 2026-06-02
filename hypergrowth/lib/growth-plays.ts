import { roundScore } from "./text";
import type {
  GrowthChannel,
  GrowthPlay,
  GrowthPlayScore,
  PainCluster,
  PainSignal,
  SignalScore,
} from "./types";

export function buildGrowthPlays(
  clusters: PainCluster[],
  signals: PainSignal[],
  scores: SignalScore[]
): GrowthPlay[] {
  return clusters.flatMap((cluster, index) => {
    const clusterSignals = signals.filter((signal) =>
      cluster.signalIds.includes(signal.id)
    );
    const channels = chooseChannels(cluster, clusterSignals);

    return channels.map((channel, channelIndex) => {
      const id = `play-${index + 1}-${channelIndex + 1}`;
      const play = buildPlay(id, channel, cluster);
      return {
        ...play,
        score: scoreGrowthPlay(id, channel, cluster, clusterSignals, scores),
      };
    });
  }).sort((a, b) => (b.score?.expectedValue ?? 0) - (a.score?.expectedValue ?? 0));
}

function chooseChannels(
  cluster: PainCluster,
  signals: PainSignal[]
): GrowthChannel[] {
  const channels = new Set<GrowthChannel>();

  if ((cluster.sourceDiversity ?? 1) >= 2 || cluster.frequency >= 3) {
    channels.add("content");
  }

  if (signals.some((signal) => /team|production|scale|infra/i.test(signal.quote))) {
    channels.add("outbound");
  }

  if (signals.some((signal) => (signal.engagement ?? 0) >= 25)) {
    channels.add("community");
  }

  if ((cluster.averageHyperbrowserFit ?? 0) >= 0.55) {
    channels.add("landing-page");
  }

  if (channels.size === 0) channels.add("content");
  return Array.from(channels).slice(0, 3);
}

function buildPlay(
  id: string,
  channel: GrowthChannel,
  cluster: PainCluster
): GrowthPlay {
  const title = titleFor(channel, cluster.title);

  return {
    id,
    channel,
    title,
    insight: cluster.summary,
    recommendedAction: actionFor(channel, cluster.title),
    copyDraft: copyFor(channel, cluster.title),
    supportingSignalIds: cluster.signalIds,
  };
}

function scoreGrowthPlay(
  playId: string,
  channel: GrowthChannel,
  cluster: PainCluster,
  signals: PainSignal[],
  scores: SignalScore[]
): GrowthPlayScore {
  const relatedScores = signals
    .map((signal) => scores.find((score) => score.signalId === signal.id))
    .filter((score): score is SignalScore => Boolean(score));
  const commercialValue = average(relatedScores.map((score) => score.commercialIntent));
  const evidenceStrength = cluster.clusterStrength ?? 0;
  const channelFit = calculateChannelFit(channel, cluster, relatedScores);
  const executionCost = executionCostFor(channel);
  const confidence = cluster.confidence ?? average(relatedScores.map((score) => score.confidence));
  const expectedValue =
    commercialValue * evidenceStrength * channelFit * confidence - executionCost;

  return {
    playId,
    commercialValue: roundScore(commercialValue),
    evidenceStrength: roundScore(evidenceStrength),
    channelFit: roundScore(channelFit),
    executionCost: roundScore(executionCost),
    confidence: roundScore(confidence),
    expectedValue: roundScore(Math.max(0, expectedValue)),
    reasons: [
      `${cluster.signalIds.length} supporting signal${
        cluster.signalIds.length === 1 ? "" : "s"
      }`,
      `${cluster.sourceDiversity ?? 1} source type${
        (cluster.sourceDiversity ?? 1) === 1 ? "" : "s"
      } represented`,
      `${channel} channel fit selected by evidence pattern`,
    ],
  };
}

function calculateChannelFit(
  channel: GrowthChannel,
  cluster: PainCluster,
  scores: SignalScore[]
): number {
  const commercialIntent = average(scores.map((score) => score.commercialIntent));
  const painIntensity = average(scores.map((score) => score.painIntensity));
  const sourceDiversity = Math.min(1, (cluster.sourceDiversity ?? 1) / 3);

  if (channel === "outbound") return 0.35 + commercialIntent * 0.55;
  if (channel === "content") return 0.3 + sourceDiversity * 0.35 + painIntensity * 0.25;
  if (channel === "community") return 0.34 + sourceDiversity * 0.25 + painIntensity * 0.3;
  return 0.32 + (cluster.averageHyperbrowserFit ?? 0) * 0.5;
}

function executionCostFor(channel: GrowthChannel): number {
  if (channel === "outbound") return 0.13;
  if (channel === "content") return 0.2;
  if (channel === "community") return 0.16;
  return 0.11;
}

function average(values: number[]): number {
  if (values.length === 0) return 0.45;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function titleFor(channel: GrowthChannel, clusterTitle: string): string {
  if (channel === "outbound") return `Outbound segment for ${clusterTitle}`;
  if (channel === "community") return `Community response around ${clusterTitle}`;
  if (channel === "landing-page") return `Landing-page proof for ${clusterTitle}`;
  return `Technical content on ${clusterTitle}`;
}

function actionFor(channel: GrowthChannel, clusterTitle: string): string {
  if (channel === "outbound") {
    return `Find teams publicly mentioning ${clusterTitle.toLowerCase()} and send a short evidence-aware note about removing that browser automation burden.`;
  }

  if (channel === "community") {
    return `Join active threads with a practical debugging checklist and show where managed browser infrastructure changes the failure mode.`;
  }

  if (channel === "landing-page") {
    return `Add a concise proof block that names ${clusterTitle.toLowerCase()} and links it to Hyperbrowser's hosted browser reliability.`;
  }

  return `Publish a technical teardown that explains ${clusterTitle.toLowerCase()}, shows why local scripts fail, and demonstrates a managed-browser alternative.`;
}

function copyFor(channel: GrowthChannel, clusterTitle: string): string {
  if (channel === "outbound") {
    return `Saw your team dealing with ${clusterTitle.toLowerCase()}. Hyperbrowser handles the browser infrastructure so the automation code stays the product.`;
  }

  if (channel === "community") {
    return `The tricky part of ${clusterTitle.toLowerCase()} is usually not the selector. It is the production browser environment around it.`;
  }

  if (channel === "landing-page") {
    return `Browser automation that keeps working after the demo: hosted sessions, retries, and extraction built for the real web.`;
  }

  return `Your browser automation does not fail in demos. It fails on the real web.`;
}
