import type { SiteCapture } from "./inspect";

/**
 * The contract every generated script must honor. Our sandbox harness executes
 * the script with:
 *   - playwright-core preinstalled (symlinked so `import ... from "playwright-core"` resolves)
 *   - node --experimental-strip-types  (so TypeScript runs directly)
 *   - env: HB_CDP_URL, TARGET_URL, HB_SHOT_PATH, and optionally HB_USERNAME/HB_PASSWORD
 * The browser SESSION is created and torn down by the host — the script only
 * connects to it. This is why the script never imports @hyperbrowser/sdk.
 */
export const SCRIPT_CONTRACT = `You write a SINGLE TypeScript file — a Playwright automation. Output ONLY the code. No markdown fences, no prose, no explanation before or after.

HARD REQUIREMENTS — the file runs verbatim with \`node --experimental-strip-types\`, so:
- Use ONLY type ANNOTATIONS (they get stripped). NO enums, NO namespaces, NO decorators, NO parameter properties, NO \`import type\` of runtime values.
- The ONLY import allowed is: import { chromium } from "playwright-core";  (you may also import Playwright TYPES from "playwright-core"). Do NOT import @hyperbrowser/sdk or anything else.

CONNECT (the browser session already exists — do not create or stop one):
  const browser = await chromium.connectOverCDP(process.env.HB_CDP_URL as string);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());

NAVIGATE yourself to the target — the page may start blank:
  await page.goto(process.env.TARGET_URL as string, { waitUntil: "domcontentloaded", timeout: 45000 });

PROGRESS: before each meaningful action (navigate, click, fill, submit, extract) print a step marker:
  console.log("@@STEP@@navigate to careers page");

CREDENTIALS (only if the task needs a login): read process.env.HB_USERNAME and process.env.HB_PASSWORD. NEVER hardcode credentials, never print them.

EXTRACT the answer into a plain JS value (array/object/string). Print EXACTLY ONE result line:
  console.log("@@RESULT@@" + JSON.stringify(data));

SCREENSHOT the final state right before finishing:
  await page.screenshot({ path: process.env.HB_SHOT_PATH as string });

FINISH: wrap everything in an async main() with try/catch. On any error print @@ERROR@@ and exit non-zero:
  main().catch((e) => { console.log("@@ERROR@@" + (e?.message ?? String(e))); process.exit(1); });
Always \`await browser.close();\` at the end of the happy path (never stop the session).

SELECTORS: derive them from the REAL page structure you are given below — prefer getByRole/getByText and the exact selectors listed. Use explicit timeouts. Do not invent selectors that are not supported by the capture. Wait for elements before acting. Keep the run short — no arbitrary long sleeps.`;

function truncate(s: string, cap: number): string {
  if (s.length <= cap) return s;
  return s.slice(0, cap) + `\n… [truncated ${s.length - cap} chars]`;
}

/** Render a capture into a compact but generous block for K3's big context. */
export function renderCapture(cap: SiteCapture, charCap: number): string {
  const lines: string[] = [];
  lines.push(`URL: ${cap.url}`);
  lines.push(`TITLE: ${cap.title}`);
  if (cap.forms.length) {
    lines.push(`\nFORMS (${cap.forms.length}):`);
    for (const f of cap.forms) lines.push(`  form ${f.selector} -> fields: ${f.fields.join(", ") || "(none)"}`);
  }
  if (cap.inputs.length) {
    lines.push(`\nINPUTS (${cap.inputs.length}):`);
    for (const i of cap.inputs) lines.push(`  ${i.selector}  [type=${i.type}]${i.name ? " name=" + i.name : ""}${i.placeholder ? ' placeholder="' + i.placeholder + '"' : ""}`);
  }
  if (cap.clickables.length) {
    lines.push(`\nINTERACTIVE (${cap.clickables.length}):`);
    for (const c of cap.clickables) lines.push(`  <${c.tag}> ${c.role ? "role=" + c.role + " " : ""}"${c.text}"  selector: ${c.selector}`);
  }
  if (cap.links.length) {
    lines.push(`\nLINKS (${cap.links.length}):`);
    for (const l of cap.links) lines.push(`  "${l.text}" -> ${l.href}`);
  }
  if (cap.accessibilityTree) lines.push(`\nACCESSIBILITY TREE:\n${cap.accessibilityTree}`);
  lines.push(`\nVISIBLE TEXT OUTLINE:\n${cap.textOutline}`);
  return truncate(lines.join("\n"), charCap);
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// ── Planner: resolve URL sanity + safety verdict ────────────────────────────
export function buildPlannerMessages(task: string, url: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a safety and intent gate for a browser-automation builder. Given a task and target URL, reply with STRICT JSON only (no prose):
{"allowed": boolean, "reason": string, "plan": string}
Set "allowed": false ONLY for clearly abusive tasks: bulk credential testing / credential stuffing, scraping personal data at scale, defeating paywalls or auth you don't own, spam, or mass account creation. Ordinary scraping, logging into an account the user controls, and exporting your own data are ALLOWED. "reason" is a short user-facing sentence (why refused, or "ok"). "plan" is a one-line description of what the automation will do.`,
    },
    { role: "user", content: `TASK: ${task}\nURL: ${url}` },
  ];
}

// ── Ask whether one more page should be inspected before writing ────────────
export function buildNavRequestMessages(task: string, cap: SiteCapture, charCap: number): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are about to write a Playwright automation. You've been given the structure of the ENTRY page. If — and only if — the task clearly requires acting on a DIFFERENT page whose structure you cannot infer from here (e.g. a page reached after clicking a link you can see), you may request to inspect ONE more page first. Reply STRICT JSON only:
{"navigate": string | null}
"navigate" is an absolute URL present in the capture's links, or null if the entry page is enough. Prefer null unless a second capture materially improves accuracy.`,
    },
    { role: "user", content: `TASK: ${task}\n\nENTRY PAGE CAPTURE:\n${renderCapture(cap, charCap)}` },
  ];
}

// ── Generator: write the script against the real structure ──────────────────
export function buildGeneratorMessages(
  task: string,
  targetUrl: string,
  captures: SiteCapture[],
  charCap: number,
  needsLogin: boolean
): ChatMessage[] {
  const capBlocks = captures
    .map((c, i) => `=== PAGE ${i + 1} ===\n${renderCapture(c, Math.floor(charCap / captures.length))}`)
    .join("\n\n");
  const loginNote = needsLogin
    ? `\n\nThis task needs a login. Credentials are in process.env.HB_USERNAME and process.env.HB_PASSWORD — use them, never hardcode.`
    : "";
  return [
    { role: "system", content: SCRIPT_CONTRACT },
    {
      role: "user",
      content: `TASK: ${task}\nTARGET_URL: ${targetUrl}${loginNote}\n\nREAL PAGE STRUCTURE (use these selectors):\n\n${capBlocks}\n\nWrite the complete TypeScript automation now. Code only.`,
    },
  ];
}

// ── Repair: one fix attempt with the error + a fresh capture ────────────────
export function buildRepairMessages(
  priorMessages: ChatMessage[],
  brokenScript: string,
  errorText: string,
  stdout: string,
  freshCapture: SiteCapture,
  charCap: number
): ChatMessage[] {
  const assistant: ChatMessage = { role: "assistant", content: brokenScript };
  return [
    ...priorMessages,
    assistant,
    {
      role: "user",
      content: `The script failed. Fix it and return the COMPLETE corrected TypeScript file (code only, same contract).

ERROR:
${errorText || "(no @@ERROR@@ marker — likely produced no @@RESULT@@ line or timed out)"}

STDOUT (last lines):
${truncate(stdout, 2000)}

FRESH CAPTURE of the page right now (selectors may have changed):
${renderCapture(freshCapture, charCap)}`,
    },
  ];
}

/** Strip markdown fences / stray prose so we execute pure code. */
export function extractCode(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:typescript|ts|javascript|js)?\s*\n([\s\S]*?)```/i);
  if (fence) s = fence[1];
  // If the model prefixed prose, cut to the first import/const/async line.
  const firstCode = s.search(/^\s*(import |const |let |async |\/\/|\/\*)/m);
  if (firstCode > 0) s = s.slice(firstCode);
  return s.trim();
}

/** Heuristic: does the task imply a login the user must supply creds for? */
export function taskNeedsLogin(task: string): boolean {
  return /\b(log ?in|sign ?in|log ?on|authenticate|my account|dashboard|invoices?|export)\b/i.test(task);
}
