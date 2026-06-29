import { Hyperbrowser } from "@hyperbrowser/sdk";
import { chromium, type Browser, type Page } from "playwright";

// ---- session lifecycle ----
//
// Verified-persistence pattern (matches the sibling hyperskill app's working
// lib/hyperbrowser.ts): create a session, read session.wsEndpoint, connect with
// Playwright over CDP. The brief adds acceptCookies + timeoutMinutes and a
// &keepAlive=true query param so the session is not torn down mid-run; we also
// never close a page mid-run (closing all pages stops the session). After
// `npm install`, confirm these param names against the installed
// @hyperbrowser/sdk types — they were not installed in this repo when written.

export type Session = {
  client: Hyperbrowser;
  browser: Browser;
  page: Page;
  sessionId: string;
  liveUrl: string | null;
};

export async function openSession(): Promise<Session> {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) throw new Error("HYPERBROWSER_API_KEY is not set");
  const client = new Hyperbrowser({ apiKey });

  const session = await client.sessions.create({
    acceptCookies: true,
    timeoutMinutes: 10,
    useStealth: true,
    useProxy: true,
    solveCaptchas: true,
    screen: { width: 1440, height: 900 },
  });

  const browser = await chromium.connectOverCDP(
    session.wsEndpoint + "&keepAlive=true"
  );
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  let liveUrl: string | null = null;
  try {
    const detail = await client.sessions.get(session.id, {
      liveViewTtlSeconds: 600,
    });
    liveUrl = detail.liveUrl ?? null;
  } catch {
    /* live view is best-effort */
  }

  return { client, browser, page, sessionId: session.id, liveUrl };
}

export async function closeSession(s: Session): Promise<void> {
  // Only at the very end of a run — never mid-run.
  await s.browser.close().catch(() => undefined);
  await s.client.sessions.stop(s.sessionId).catch(() => undefined);
}

// ---- text observation (identical modality for all three models) ----
//
// Serialize the page to TEXT: interactive elements with stable indices plus
// visible text. No screenshot — GLM-5.2 has no vision, so a text-DOM
// observation is the level playing field. Each interactive element is tagged
// in the DOM with data-awi-idx so actions can target it deterministically.

export type ElementRef = { index: number; tag: string; label: string };

export type Observation = {
  url: string;
  title: string;
  text: string; // the serialized observation handed to the model
  elements: ElementRef[];
};

// Passed to page.evaluate as a STRING expression, so it must be an invoked
// IIFE: a bare "() => {...}" string evaluates to an uncalled function and
// returns undefined.
const SERIALIZE = `(() => {
  const sel = 'a, button, input, textarea, select, [role=button], [role=link], [role=tab], [onclick]';
  const nodes = Array.from(document.querySelectorAll(sel));
  const elements = [];
  let i = 0;
  for (const el of nodes) {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const visible = style.display !== 'none' && style.visibility !== 'hidden' &&
      Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    if (!visible) continue;
    el.setAttribute('data-awi-idx', String(i));
    const tag = el.tagName.toLowerCase();
    let label = (el.getAttribute('aria-label') || el.getAttribute('placeholder') ||
      el.getAttribute('name') || (el.innerText || el.value || el.getAttribute('title') || '')
    ).replace(/\\s+/g, ' ').trim().slice(0, 80);
    elements.push({ index: i, tag, label });
    i++;
  }
  // visible page text, trimmed for the observation
  const bodyText = (document.body.innerText || '').replace(/\\n{2,}/g, '\\n').trim().slice(0, 2500);
  return { title: document.title, elements, bodyText };
})()`;

export async function serialize(page: Page): Promise<Observation> {
  const data = (await page.evaluate(SERIALIZE)) as {
    title: string;
    elements: ElementRef[];
    bodyText: string;
  };

  const lines = data.elements.map(
    (e) => `[${e.index}] ${e.tag} "${e.label}"`
  );
  const text = [
    `URL: ${page.url()}`,
    `TITLE: ${data.title}`,
    ``,
    `INTERACTIVE ELEMENTS:`,
    lines.join("\n") || "(none)",
    ``,
    `VISIBLE TEXT:`,
    data.bodyText,
  ].join("\n");

  return { url: page.url(), title: data.title, text, elements: data.elements };
}

// ---- action execution ----

export type Action =
  | { action: "click"; target: number }
  | { action: "type"; target: number; text: string }
  | { action: "done" };

export type ActionResult = { ok: boolean; detail: string };

export async function execute(
  page: Page,
  action: Action
): Promise<ActionResult> {
  try {
    if (action.action === "done") return { ok: true, detail: "done" };

    const locator = page.locator(`[data-awi-idx="${action.target}"]`);
    if ((await locator.count()) === 0) {
      return { ok: false, detail: `no element at index ${action.target}` };
    }

    if (action.action === "click") {
      await locator.first().click({ timeout: 8000 });
      await page
        .waitForLoadState("domcontentloaded", { timeout: 8000 })
        .catch(() => undefined);
      return { ok: true, detail: `clicked [${action.target}]` };
    }

    if (action.action === "type") {
      await locator.first().fill(action.text, { timeout: 8000 });
      await locator.first().press("Enter").catch(() => undefined);
      await page
        .waitForLoadState("domcontentloaded", { timeout: 8000 })
        .catch(() => undefined);
      return { ok: true, detail: `typed "${action.text}" into [${action.target}]` };
    }

    return { ok: false, detail: "unknown action" };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "execute failed",
    };
  }
}

// Human-readable one-liner for transcripts and replay frames.
export function describeAction(a: Action, obs: Observation): string {
  if (a.action === "done") return "agent reports done";
  const el = obs.elements.find((e) => e.index === a.target);
  const label = el ? `"${el.label}"` : `[${a.target}]`;
  if (a.action === "click") return `click ${label}`;
  return `type "${a.text}" into ${label}`;
}
