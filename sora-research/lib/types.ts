export interface UploadResponse {
  run_id: string;
  frames: string[];
  video_url?: string;
}

export interface SearchResult {
  url: string;
  title: string;
  author?: string;
  date?: string;
  screenshot?: string;
}

export interface PricingResult {
  platform: string;
  url: string;
  pricing_model: string;
  estimated_cost: string;
  cost_per_second?: string;
  features: string[];
  recommendation_score: number;
}

export interface SearchResponse {
  run_id: string;
  results: SearchResult[];
}

export interface PricingResponse {
  run_id: string;
  pricing: PricingResult[];
  cheapest: PricingResult;
}

export interface AudioTranscription {
  text: string;
  has_speech: boolean;
  has_music: boolean;
  duration: number;
}

export interface PromptResult {
  prompt: string;
  style_tags: string[];
  confidence: number;
  audio_context?: string;
}

export interface SummaryResponse {
  summary: string;
  source?: SearchResult;
  prompt?: PromptResult;
}

export interface RunData {
  run_id: string;
  video_path: string;
  video_duration?: number;
  frames: string[];
  audio_path?: string;
  audio_transcription?: AudioTranscription;
  search_results?: SearchResult[];
  pricing_results?: PricingResult[];
  prompt_result?: PromptResult;
  summary?: string;
  created_at: string;
}

export interface AnalysisResponse {
  run_id: string;
  has_audio: boolean;
  audio_transcription: AudioTranscription | null;
  prompt_result: PromptResult | null;
  pricing_results: PricingResult[] | null;
  summary: string | null;
}

export interface ErrorResponse {
  error: string;
}