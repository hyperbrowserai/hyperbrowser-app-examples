export interface Predictions {
  favorite: number;
  reply: number;
  repost: number;
  bookmark: number;
  profile_click: number;
  dwell: number;
  vqv: number;
  share: number;
  quote: number;
  follow_author: number;
  not_interested: number;
  block_author: number;
  mute_author: number;
  report: number;
}

export interface Breakdown {
  favoriteWeighted: number;
  replyWeighted: number;
  repostWeighted: number;
  bookmarkWeighted: number;
  profileClickWeighted: number;
  shareWeighted: number;
  quoteWeighted: number;
  negativeTotal: number;
}

export type SignalType = "positive" | "warning" | "negative";

export interface Signal {
  type: SignalType;
  label: string;
  detail: string;
}

export interface ScoreResult {
  score: number;
  verdict: string;
  predictions: Predictions;
  breakdown: Breakdown;
  signals: Signal[];
  suggestions: string[];
}

export type StreamEvent =
  | { step: number; message: string }
  | { step: number; message: string; result: ScoreResult }
  | { error: string };
