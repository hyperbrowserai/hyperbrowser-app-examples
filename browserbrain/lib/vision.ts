// The understanding step: read the page the way a human would by looking at the
// screenshot, and return the structured memory. Scraped markdown is a backup signal
// only. Model is gpt-5.5.

import OpenAI from "openai";
import type { KeyElement, NavItem, VisionMemory } from "./types";

const MODEL = "gpt-5.5";

const PROMPT = `You are giving a coding agent "eyes". Look at this screenshot of a web page the way a human would and build a structured memory of it. Rely on what you SEE in the image; the page text below is only a backup for labels and links.

Return ONLY a JSON object (no prose, no markdown fences) with exactly these fields:
{
  "pageType": "landing | dashboard | docs | pricing | app | blog | ...",
  "purpose": "one line: what this page is for",
  "layout": ["ordered list of visible sections top to bottom, e.g. header, hero, feature grid, pricing, footer"],
  "keyElements": [
    { "label": "Get Started button", "type": "button", "location": "top right of header", "leadsTo": "/signup" }
  ],
  "navigation": [{ "label": "Pricing", "href": "/pricing" }],
  "actions": ["short verbs an agent can do here, e.g. sign up, book demo, search docs"],
  "notes": "anything an agent should know before acting: auth walls, modals, cookie banners, empty states"
}

For keyElements, "location" must describe where it is on screen so an agent can find it. Omit "leadsTo" when unknown. Keep arrays focused on what matters, not exhaustive.`;

const VISION_MEMORY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pageType", "purpose", "layout", "keyElements", "navigation", "actions", "notes"],
  properties: {
    pageType: { type: "string" },
    purpose: { type: "string" },
    layout: { type: "array", items: { type: "string" } },
    keyElements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "type", "location", "leadsTo"],
        properties: {
          label: { type: "string" },
          type: { type: "string" },
          location: { type: "string" },
          leadsTo: { type: ["string", "null"] },
        },
      },
    },
    navigation: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "href"],
        properties: {
          label: { type: "string" },
          href: { type: "string" },
        },
      },
    },
    actions: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asString).filter(Boolean) : [];
}

function asKeyElements(value: unknown): KeyElement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const source = item as Record<string, unknown>;
      const element: KeyElement = {
        label: asString(source.label),
        type: asString(source.type),
        location: asString(source.location),
      };
      const leadsTo = asString(source.leadsTo);
      if (leadsTo) element.leadsTo = leadsTo;
      return element.label && element.type && element.location ? element : null;
    })
    .filter((item): item is KeyElement => Boolean(item));
}

function asNavigation(value: unknown): NavItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const source = item as Record<string, unknown>;
      const nav: NavItem = {
        label: asString(source.label),
        href: asString(source.href),
      };
      return nav.label && nav.href ? nav : null;
    })
    .filter((item): item is NavItem => Boolean(item));
}

function normalizeMemory(value: unknown): VisionMemory {
  if (!value || typeof value !== "object") {
    throw new Error("Vision model returned JSON, but it was not an object.");
  }

  const source = value as Record<string, unknown>;
  const memory: VisionMemory = {
    pageType: asString(source.pageType) || "unknown",
    purpose: asString(source.purpose),
    layout: asStringArray(source.layout),
    keyElements: asKeyElements(source.keyElements),
    navigation: asNavigation(source.navigation),
    actions: asStringArray(source.actions),
    notes: asString(source.notes),
  };

  if (!memory.purpose || memory.layout.length === 0) {
    throw new Error("Vision model returned JSON, but it was missing required memory details.");
  }

  return memory;
}

function extractJson(text: string): VisionMemory {
  // Model is told to return raw JSON, but strip fences / surrounding prose defensively.
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Vision model did not return JSON:\n${text.slice(0, 500)}`);
  }
  return normalizeMemory(JSON.parse(s.slice(start, end + 1)));
}

async function requestVisionMemory({
  openai,
  imageUrl,
  text,
  structured,
}: {
  openai: OpenAI;
  imageUrl: string;
  text: string;
  structured: boolean;
}) {
  return openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 4096,
    ...(structured
      ? {
          response_format: {
            type: "json_schema" as const,
            json_schema: {
              name: "vision_memory",
              strict: true,
              schema: VISION_MEMORY_SCHEMA,
            },
          },
        }
      : {}),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });
}

export async function analyze(
  screenshot: string | undefined,
  markdown: string | undefined,
): Promise<VisionMemory> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to your environment or .env.");
  }
  if (!screenshot) {
    throw new Error("No screenshot returned from scrape; cannot read the page visually.");
  }

  const openai = new OpenAI({ apiKey });

  // scrape returns a hosted URL; pass it directly. Fall back to a base64 data URL.
  const imageUrl = screenshot.startsWith("http")
    ? screenshot
    : `data:image/png;base64,${screenshot}`;

  const backup = markdown ? `\n\nPage text (backup only):\n${markdown.slice(0, 12000)}` : "";

  const first = await requestVisionMemory({
    openai,
    imageUrl,
    text: PROMPT + backup,
    structured: true,
  });

  const firstText = first.choices[0]?.message?.content ?? "";
  try {
    return extractJson(firstText);
  } catch (firstError) {
    const retry = await requestVisionMemory({
      openai,
      imageUrl,
      text: `${PROMPT}

Your previous answer could not be parsed. Return exactly one valid JSON object matching the requested schema. No markdown, no commentary.${backup}`,
      structured: true,
    });

    const retryText = retry.choices[0]?.message?.content ?? "";
    try {
      return extractJson(retryText);
    } catch {
      throw firstError;
    }
  }
}
