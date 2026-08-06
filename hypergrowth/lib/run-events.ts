import type {
  AnalysisMode,
  EvidenceQualityFlag,
  GrowthChannel,
  MineResult,
  SignalSource,
} from "./types";

export type MinePhase =
  | "planning"
  | "source_collection"
  | "quality_gate"
  | "gap_planning"
  | "evidence_preparation"
  | "normalization"
  | "pipeline"
  | "complete";

export type MineRunEvent =
  | {
      type: "run_started";
      query: string;
      analysisMode: AnalysisMode;
      sources: SignalSource[];
    }
  | {
      type: "phase_started";
      phase: MinePhase;
      label: string;
    }
  | {
      type: "search_query";
      source: SignalSource;
      query: string;
      reason: "original" | "expanded";
    }
  | {
      type: "source_result";
      source: SignalSource;
      query: string;
      raw: number;
      accepted?: number;
      rejected?: number;
      durationMs: number;
      status: "success" | "error";
      error?: string;
    }
  | {
      type: "candidate_rejected";
      source: SignalSource;
      title: string;
      flags: EvidenceQualityFlag[];
    }
  | {
      type: "evidence_accepted";
      source: SignalSource;
      title: string;
      quote: string;
      score?: number;
    }
  | {
      type: "llm_step";
      step:
        | "query_expansion"
        | "candidate_triage"
        | "page_triage"
        | "evidence_extraction"
        | "gap_expansion"
        | "judgment"
        | "synthesis";
      mode: string;
      summary: string;
    }
  | {
      type: "cluster_created";
      title: string;
      signalCount: number;
    }
  | {
      type: "play_created";
      title: string;
      channel: GrowthChannel;
    }
  | {
      type: "run_completed";
      result: MineResult;
    }
  | {
      type: "run_failed";
      message: string;
    };

export type EmitRunEvent = (event: MineRunEvent) => void | Promise<void>;

export const runEventLimits = {
  rejectedCandidates: 10,
  acceptedEvidence: 12,
  clusters: 8,
  growthPlays: 8,
} as const;

export function truncateRunEventText(value: string, maxLength = 220): string {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 3)}...`;
}
