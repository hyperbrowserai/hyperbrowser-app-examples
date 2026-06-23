// The memory schema stored per domain on the Hyperbrowser persistent volume.
// One file per domain: /brain/<domain>.json

export interface KeyElement {
  label: string;
  type: string; // button | input | link | nav | card | ...
  location: string; // human description, e.g. "top right of header"
  leadsTo?: string; // path or url the element navigates to, if known
}

export interface NavItem {
  label: string;
  href: string;
}

export interface Memory {
  domain: string;
  url: string;
  learnedAt: string; // ISO timestamp
  learnMs?: number; // how long the original learn took, for the recall-vs-learn delta
  screenshotUrl?: string; // hosted screenshot captured at learn time
  pageType: string; // landing | dashboard | docs | pricing | app | ...
  purpose: string; // one line: what this page is for
  layout: string[]; // ordered sections, top to bottom
  keyElements: KeyElement[];
  navigation: NavItem[];
  actions: string[]; // what an agent can do here
  notes: string; // auth walls, modals, cookie banners, gotchas
}

// The subset the vision model produces. Other fields are filled in by the API route.
export type VisionMemory = Omit<
  Memory,
  "domain" | "url" | "learnedAt" | "learnMs" | "screenshotUrl"
>;

// Lightweight summary for the brain panel (GET /api/brain/list).
export interface BrainSummary {
  domain: string;
  url: string;
  pageType: string;
  learnedAt: string;
  learnMs?: number;
}

// NDJSON event types streamed from POST /api/brain.
export type BrainEvent =
  | { type: "step"; label: string }
  | { type: "screenshot"; url: string }
  | {
      type: "result";
      source: "recall" | "learn";
      memory: Memory;
      learnedAt: string;
      ms: number;
    }
  | { type: "error"; message: string };
