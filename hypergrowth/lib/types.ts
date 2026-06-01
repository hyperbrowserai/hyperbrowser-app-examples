export type SignalSource = "hackernews" | "github" | "reddit";

export type Urgency = "low" | "medium" | "high";

export type GrowthChannel =
  | "content"
  | "outbound"
  | "community"
  | "landing-page";

export type PainSignal = {
  id: string;
  source: SignalSource;
  title: string;
  url: string;
  quote: string;
  author?: string;
  publishedAt?: string;
  engagement?: number;
  toolsMentioned: string[];
  painCategory: string;
  urgency: Urgency;
};

export type PainCluster = {
  id: string;
  title: string;
  summary: string;
  frequency: number;
  urgency: Urgency;
  representativeQuotes: string[];
  relatedTools: string[];
  signalIds: string[];
};

export type GrowthPlay = {
  id: string;
  channel: GrowthChannel;
  title: string;
  insight: string;
  recommendedAction: string;
  copyDraft: string;
  supportingSignalIds: string[];
};

export type MineRequest = {
  query: string;
  sources: SignalSource[];
  maxResults: number;
};

export type MineResult = {
  query: string;
  generatedAt: string;
  mode: "demo" | "live";
  signals: PainSignal[];
  clusters: PainCluster[];
  growthPlays: GrowthPlay[];
  outboundDrafts: string[];
  contentAngles: string[];
  metadata: {
    searchedSources: SignalSource[];
    errors: string[];
    notes: string[];
  };
};
