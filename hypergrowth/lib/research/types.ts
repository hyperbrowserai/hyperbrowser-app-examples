import type {
  EvidenceCandidate,
  ExecutedSearch,
  PainCategory,
  RawSignal,
  SearchDiagnostic,
  SignalSource,
} from "../types";
import type {
  HyperbrowserBrandingSummary,
  HyperbrowserPageSummary,
} from "../hyperbrowser";

export type ResearchBudget = {
  maxWaves: number;
  maxQueriesPerWave: number;
  maxFetchesPerRun: number;
  maxEnrichmentSearches: number;
  requestTimeoutMs: number;
};

export type ResearchSearch = ExecutedSearch & {
  rationale: string;
};

export type ResearchWave = {
  index: number;
  searches: ResearchSearch[];
  reason: string;
};

export type ResearchPlan = {
  strategy: "llm-autonomous" | "static-autonomous";
  originalQuery: string;
  waves: ResearchWave[];
  rationale: string[];
};

export type FetchTarget = {
  candidateId: string;
  reason: string;
};

export type FetchedDocument = {
  candidateId: string;
  url: string;
  markdown: string;
  links?: string[];
  outputFormats?: string[];
  stealth?: "none" | "auto" | "ultra";
  metadataTitle?: string;
  metadataDescription?: string;
  metadataSourceUrl?: string;
  screenshot?: {
    src: string;
    byteLength: number;
  };
  pageSummary?: HyperbrowserPageSummary;
  branding?: HyperbrowserBrandingSummary;
  richFetchStatus?: "used" | "fallback" | "basic";
  richFetchError?: string;
  pageTriage?: PageTriageDecision;
  status: "success" | "error" | "skipped";
  error?: string;
};

export type PageTriageArtifactSignal =
  | "markdown"
  | "links"
  | "json"
  | "screenshot"
  | "branding";

export type PageTriageDecision = {
  candidateId: string;
  decision: "accept" | "reject" | "needs_more_context";
  evidenceQuote?: string;
  evidenceTitle?: string;
  pageType?: string;
  painCategory?: PainCategory;
  hyperbrowserFit: number;
  confidence: number;
  reasoning: string[];
  rejectionReason?: string;
  followUpSearches: string[];
  artifactSignals: PageTriageArtifactSignal[];
};

export type EvidenceJudgment = {
  candidateId: string;
  accepted: boolean;
  quote?: string;
  title?: string;
  rationale: string;
};

export type ResearchFeedback = {
  summary: string[];
  rejectedPages: Array<{
    candidateId: string;
    source: SignalSource;
    title: string;
    url: string;
    originalSearchQuery?: string;
    rejectionReason: string;
    pageType?: string;
    confidence: number;
    reasoning: string[];
    followUpSearches: string[];
  }>;
  suggestedSearches: string[];
};

export type ResearchDiagnostics = {
  plan: ResearchPlan;
  searches: SearchDiagnostic[];
  fetchedDocuments: FetchedDocument[];
  pageTriageDecisions: PageTriageDecision[];
  feedback: ResearchFeedback[];
  judgments: EvidenceJudgment[];
  stopReason: string;
};

export type ResearchResult = {
  candidates: EvidenceCandidate[];
  qualityAccepted: EvidenceCandidate[];
  qualityRejected: EvidenceCandidate[];
  rawSignals: RawSignal[];
  executedSearches: ExecutedSearch[];
  searchDiagnostics: SearchDiagnostic[];
  rejectedCandidates: number;
  llm: {
    queryExpansionMode: "disabled" | "used" | "fallback" | "deterministic";
    candidateTriageMode: "disabled" | "used" | "fallback" | "deterministic";
    pageTriageMode: "disabled" | "used" | "fallback" | "deterministic";
    evidenceExtractionMode: "disabled" | "used" | "fallback" | "partial";
    gapExpansionMode: "disabled" | "used" | "fallback" | "deterministic";
    callsAttempted: number;
    failureReason?: string;
  };
  diagnostics: ResearchDiagnostics;
};

export type SearchAdapter = (input: {
  source: SignalSource;
  query: string;
  maxResults: number;
}) => Promise<EvidenceCandidate[]>;

export type FetchAdapter = (
  candidate: EvidenceCandidate
) => Promise<FetchedDocument>;

export type PageTriageResult = {
  decisions: PageTriageDecision[];
  mode: "disabled" | "used" | "fallback" | "deterministic";
  callsAttempted: number;
  failureReason?: string;
};

export type PageTriageAdapter = (input: {
  query: string;
  candidates: EvidenceCandidate[];
  fetchedDocuments: FetchedDocument[];
  maxDecisions: number;
  remainingLLMCalls: number;
}) => Promise<PageTriageResult>;
