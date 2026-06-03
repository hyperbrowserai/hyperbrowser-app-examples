export type SignalSource = "hackernews" | "github" | "reddit" | "hyperbrowser";

export type Urgency = "low" | "medium" | "high";

export type ConfidenceLevel = "low" | "medium" | "high";

export type AnalysisMode = "deterministic" | "lean" | "balanced" | "full";

export type EffectiveAnalysisMode =
  | "demo"
  | "live-deterministic"
  | "live-hybrid";

export type GrowthChannel =
  | "content"
  | "outbound"
  | "community"
  | "landing-page";

export type SearchStrategy =
  | "llm-source-routed"
  | "static-source-routed"
  | "original-only";

export type EvidenceKind =
  | "story"
  | "comment"
  | "issue"
  | "post"
  | "discussion"
  | "search-result"
  | "article"
  | "forum-thread"
  | "web-page";

export type EvidenceEngagement = {
  score?: number;
  comments?: number;
  stars?: number;
  reactions?: number;
};

export type QueryPlan = {
  originalQuery: string;
  strategy: SearchStrategy;
  sourceQueries: Record<SignalSource, string[]>;
  sourceWeights?: Partial<Record<SignalSource, number>>;
  rationale: string[];
};

export type OpenWebTargets = {
  includeBroadWeb: boolean;
  redditSubreddits: string[];
};

export type ExecutedSearch = {
  source: SignalSource;
  query: string;
  reason: "original" | "expanded";
};

export type PhaseTiming = {
  name: string;
  durationMs: number;
};

export type SearchDiagnostic = ExecutedSearch & {
  durationMs: number;
  status: "success" | "error";
  rawSignals: number;
  acceptedCandidates?: number;
  rejectedCandidates?: number;
  error?: string;
};

export type SourceBudgetPolicy = {
  maxSourceSearchesPerRun: number;
  maxQueriesPerSource: number;
  maxRawSignalsPerSearch: number;
  maxRawSignalsTotal: number;
  requestTimeoutMs: number;
};

export type SourceDebugSummary = {
  source: SignalSource;
  rawCandidates: number;
  qualityAccepted: number;
  qualityRejected: number;
  evidenceAccepted: number;
  finalSignals: number;
  rejectionFlags: Partial<Record<EvidenceQualityFlag, number>>;
  sampleAcceptedTitles: string[];
  sampleRejected: Array<{
    title: string;
    flags: EvidenceQualityFlag[];
  }>;
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
  evidenceKind?: EvidenceKind;
  repo?: string;
  ecosystemBoost?: boolean;
  sourceReliabilityOverride?: number;
  raw?: unknown;
};

export type EvidenceDiscoveryMethod =
  | "api"
  | "hyperbrowser-search"
  | "hyperbrowser-fetch";

export type EvidenceQualityFlag =
  | "login_required"
  | "blocked"
  | "no_results"
  | "navigation_chrome"
  | "promotional"
  | "too_short"
  | "weak_query_overlap"
  | "thin_snippet";

export type EvidenceCandidate = {
  id: string;
  source: SignalSource;
  discoveryMethod: EvidenceDiscoveryMethod;
  sourceUrl: string;
  canonicalUrl?: string;
  title: string;
  snippet: string;
  body?: string;
  author?: string;
  publishedAt?: string;
  engagement?: EvidenceEngagement;
  evidenceKind?: EvidenceKind;
  repo?: string;
  ecosystemBoost?: boolean;
  sourceReliabilityOverride?: number;
  raw?: unknown;
  qualityFlags: EvidenceQualityFlag[];
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
  evidenceKind?: EvidenceKind;
  repo?: string;
  ecosystemBoost?: boolean;
  sourceReliabilityOverride?: number;
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

export type LLMJudgment = {
  signalId: string;
  isActionable: boolean;
  contextualRelevance: number;
  impliedPainIntensity: number;
  impliedCommercialIntent: number;
  hyperbrowserFit: number;
  confidence: number;
  category: PainCategory;
  representativeQuote: string;
  reasoning: string[];
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
  generatedAt: string;
  analysisMode: AnalysisMode;
  confidence: ConfidenceLevel;
  topFinding: string;
  executiveSummary: string;
  recommendedNextStep: string;
  sourceMix: Array<{
    source: SignalSource;
    count: number;
  }>;
  topClusters: PainCluster[];
  recommendedPlays: GrowthPlay[];
  evidence: PainSignal[];
  caveats: string[];
};

export type LLMProviderMetadata = {
  available: boolean;
  provider?: string;
  model?: string;
  baseURL?: string;
};

export type LLMUsageMetadata = {
  provider?: string;
  model?: string;
  queryExpansionMode: "disabled" | "used" | "fallback";
  candidateTriageMode?: "disabled" | "used" | "fallback";
  evidenceExtractionMode?: "disabled" | "used" | "fallback" | "partial";
  gapExpansionMode?: "disabled" | "used" | "fallback";
  judgmentMode: "disabled" | "used" | "fallback" | "partial";
  synthesisMode: "disabled" | "used" | "fallback";
  callsAttempted: number;
  failureReason?: string;
};

export type MineRequest = {
  query: string;
  sources: SignalSource[];
  maxResults: number;
  analysisMode?: AnalysisMode;
  openWebTargets?: OpenWebTargets;
};

export type MinePipelineResult = {
  signals: PainSignal[];
  signalScores: SignalScore[];
  dedupeGroups: DedupeGroup[];
  llmJudgments: LLMJudgment[];
  clusters: PainCluster[];
  growthPlays: GrowthPlay[];
  outboundDrafts: string[];
  contentAngles: string[];
  brief: GrowthBrief;
  llm: LLMUsageMetadata;
};

export type MineMetadata = {
  searchedSources: SignalSource[];
  errors: string[];
  notes: string[];
  requestedAnalysisMode: AnalysisMode;
  effectiveAnalysisMode: AnalysisMode;
  analysisMode: EffectiveAnalysisMode;
  downgradeReason?: string;
  queryPlan?: QueryPlan;
  executedSearches?: ExecutedSearch[];
  searchDiagnostics?: SearchDiagnostic[];
  sourceDebug?: SourceDebugSummary[];
  timings?: PhaseTiming[];
  llm: LLMUsageMetadata;
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
  llmJudgments?: LLMJudgment[];
  brief?: GrowthBrief;
  metadata: MineMetadata;
};
