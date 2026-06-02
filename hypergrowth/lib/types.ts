export type SignalSource = "hackernews" | "github" | "reddit";

export type Urgency = "low" | "medium" | "high";

export type GrowthChannel =
  | "content"
  | "outbound"
  | "community"
  | "landing-page";

export type EvidenceEngagement = {
  score?: number;
  comments?: number;
  stars?: number;
  reactions?: number;
};

export type RawSignal = {
  source: SignalSource;
  sourceUrl: string;
  canonicalUrl?: string;
  title: string;
  quote: string;
  author?: string;
  publishedAt?: string;
  engagement?: EvidenceEngagement;
  raw?: unknown;
};

export type PainSignal = {
  id: string;
  source: SignalSource;
  sourceUrl: string;
  canonicalUrl: string;
  title: string;
  url: string;
  quote: string;
  author?: string;
  publishedAt?: string;
  extractedAt: string;
  engagement?: number;
  engagementDetails?: EvidenceEngagement;
  matchedTerms: string[];
  toolsMentioned: string[];
  painCategory: PainCategory;
  urgency: Urgency;
};

export type PainCategory =
  | "anti_bot_reliability"
  | "session_persistence"
  | "browser_infra_cost"
  | "dynamic_js_extraction"
  | "agent_navigation_failure"
  | "proxy_retry_complexity"
  | "data_quality_extraction"
  | "workflow_maintenance"
  | "developer_workflow_friction";

export type SignalScore = {
  signalId: string;
  relevance: number;
  painIntensity: number;
  commercialIntent: number;
  hyperbrowserFit: number;
  recency: number;
  sourceReliability: number;
  confidence: number;
  total: number;
  reasons: string[];
};

export type DedupeGroup = {
  id: string;
  canonicalSignalId: string;
  duplicateSignalIds: string[];
  compressionRatio: number;
  similarityThreshold: number;
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
  sourceDiversity?: number;
  averagePainIntensity?: number;
  averageHyperbrowserFit?: number;
  clusterStrength?: number;
  confidence?: number;
};

export type GrowthPlayScore = {
  playId: string;
  commercialValue: number;
  evidenceStrength: number;
  channelFit: number;
  executionCost: number;
  confidence: number;
  expectedValue: number;
  reasons: string[];
};

export type GrowthPlay = {
  id: string;
  channel: GrowthChannel;
  title: string;
  insight: string;
  recommendedAction: string;
  copyDraft: string;
  supportingSignalIds: string[];
  score?: GrowthPlayScore;
};

export type GrowthBrief = {
  query: string;
  executiveSummary: string;
  topFinding: string;
  topClusters: PainCluster[];
  recommendedPlays: GrowthPlay[];
  evidence: PainSignal[];
  caveats: string[];
  generatedAt: string;
};

export type MineRequest = {
  query: string;
  sources: SignalSource[];
  maxResults: number;
};

export type MinePipelineResult = {
  signals: PainSignal[];
  signalScores: SignalScore[];
  dedupeGroups: DedupeGroup[];
  clusters: PainCluster[];
  growthPlays: GrowthPlay[];
  outboundDrafts: string[];
  contentAngles: string[];
  brief: GrowthBrief;
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
  signalScores?: SignalScore[];
  dedupeGroups?: DedupeGroup[];
  brief?: GrowthBrief;
  metadata: {
    searchedSources: SignalSource[];
    errors: string[];
    notes: string[];
  };
};
