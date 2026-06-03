import type {
  EvidenceCandidate,
  ExecutedSearch,
  RawSignal,
  SearchDiagnostic,
  SignalSource,
} from "../types";

export type ResearchBudget = {
  maxWaves: number;
  maxQueriesPerWave: number;
  maxFetchesPerRun: number;
  maxEvidence: number;
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
  status: "success" | "error" | "skipped";
  error?: string;
};

export type EvidenceJudgment = {
  candidateId: string;
  accepted: boolean;
  quote?: string;
  title?: string;
  rationale: string;
};

export type ResearchDiagnostics = {
  plan: ResearchPlan;
  searches: SearchDiagnostic[];
  fetchedDocuments: FetchedDocument[];
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
    queryExpansionMode: "disabled" | "used" | "fallback";
    candidateTriageMode: "disabled" | "used" | "fallback";
    evidenceExtractionMode: "disabled" | "used" | "fallback" | "partial";
    gapExpansionMode: "disabled" | "used" | "fallback";
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
