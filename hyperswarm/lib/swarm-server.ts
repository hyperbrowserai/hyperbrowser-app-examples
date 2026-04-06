import type { BrowserUseStep, BrowserUseTaskData } from "@hyperbrowser/sdk/types";
import type { SubTask } from "@/lib/types";

export function buildBrowserTask(sub: SubTask): string {
  return `${sub.task}

Navigate from or open: ${sub.url}

Return structured notes covering: ${sub.extractionGoal}`;
}

export function extractStepLabel(step: unknown): string {
  if (!step || typeof step !== "object") return "Working";
  const s = step as Record<string, unknown>;
  const mo = s.model_output as Record<string, unknown> | null | undefined;
  if (mo && typeof mo === "object") {
    if (typeof mo.next_goal === "string" && mo.next_goal.trim())
      return mo.next_goal.trim().slice(0, 200);
    if (typeof mo.memory === "string" && mo.memory.trim())
      return mo.memory.trim().slice(0, 200);
    if (typeof mo.thinking === "string" && mo.thinking.trim())
      return mo.thinking.trim().slice(0, 200);
  }
  return "Working";
}

export function collectUrlsFromSteps(data: BrowserUseTaskData | null | undefined): Set<string> {
  const urls = new Set<string>();
  if (!data?.steps?.length) return urls;
  for (const step of data.steps as BrowserUseStep[]) {
    if (step && typeof step === "object" && "state" in step) {
      const st = step as { state?: { url?: string } };
      if (typeof st.state?.url === "string" && st.state.url) urls.add(st.state.url);
    }
  }
  return urls;
}

const MAX_FRAME_SSE_CHARS = 520_000;

/** Normalize last step screenshot for UI (data URL or https). Skip oversized payloads for SSE. */
export function extractLastScreenshotForClient(
  data: BrowserUseTaskData | null | undefined,
): string | null {
  if (!data?.steps?.length) return null;
  const steps = data.steps as BrowserUseStep[];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (!step || typeof step !== "object" || !("state" in step)) continue;
    const raw = (step as { state?: { screenshot?: string | null } }).state?.screenshot;
    if (typeof raw !== "string" || !raw.trim()) continue;
    const s = raw.trim();
    if (s.startsWith("data:image/") && s.length <= MAX_FRAME_SSE_CHARS) return s;
    if (s.startsWith("https://") || s.startsWith("http://")) return s;
    if (s.startsWith("data:")) {
      if (s.length <= MAX_FRAME_SSE_CHARS) return s;
      return null;
    }
    const dataUrl = `data:image/png;base64,${s}`;
    if (dataUrl.length > MAX_FRAME_SSE_CHARS) return null;
    return dataUrl;
  }
  return null;
}

export function extractLastPageUrlFromTask(
  data: BrowserUseTaskData | null | undefined,
): string | null {
  if (!data?.steps?.length) return null;
  const steps = data.steps as BrowserUseStep[];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (!step || typeof step !== "object" || !("state" in step)) continue;
    const url = (step as { state?: { url?: string } }).state?.url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return null;
}
