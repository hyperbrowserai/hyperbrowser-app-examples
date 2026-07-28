import { chromium } from "playwright-core";
import type { Hyperbrowser } from "@hyperbrowser/sdk";
import { CONFIG } from "./config";

export interface Clickable {
  tag: string;
  role: string;
  text: string;
  selector: string;
}
export interface InputField {
  selector: string;
  type: string;
  name: string;
  placeholder: string;
}
export interface FormInfo {
  selector: string;
  fields: string[];
}
export interface LinkInfo {
  text: string;
  href: string;
}

export interface SiteCapture {
  url: string;
  title: string;
  accessibilityTree: string;
  textOutline: string;
  clickables: Clickable[];
  inputs: InputField[];
  forms: FormInfo[];
  links: LinkInfo[];
}

/**
 * In-page harvester. Runs inside the browser context, so it must be a
 * self-contained function with no external references. Returns the real page
 * structure — interactive elements with usable selectors, form fields, links,
 * and a visible-text outline — which is what we feed K3 so it writes against
 * what's actually there instead of guessing.
 */
function harvest() {
  const cap = { clickables: 400, links: 120, inputs: 60, text: 9000 };

  const cssEscape = (s: string) =>
    typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : s.replace(/([^\w-])/g, "\\$1");

  function selectorFor(el: Element): string {
    if (el.id) return `#${cssEscape(el.id)}`;
    const name = el.getAttribute("name");
    if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
    const testid = el.getAttribute("data-testid") || el.getAttribute("data-test");
    if (testid) return `[data-testid="${testid}"]`;
    const aria = el.getAttribute("aria-label");
    if (aria) return `${el.tagName.toLowerCase()}[aria-label="${aria}"]`;
    // Fallback: shallow nth-of-type path from nearest id-ed ancestor.
    const parts: string[] = [];
    let node: Element | null = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${cssEscape(node.id)}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sibs = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
        if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
      depth++;
    }
    return parts.join(" > ");
  }

  const clean = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim().slice(0, 120);

  const clickables: { tag: string; role: string; text: string; selector: string }[] = [];
  const seen = new Set<string>();
  const clickSel = 'a, button, [role="button"], [role="tab"], [role="menuitem"], input[type="submit"], input[type="button"], [onclick]';
  document.querySelectorAll(clickSel).forEach((el) => {
    if (clickables.length >= cap.clickables) return;
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    const text = clean((el as HTMLElement).innerText || el.getAttribute("aria-label") || el.getAttribute("title"));
    const sel = selectorFor(el);
    const key = sel + "|" + text;
    if (seen.has(key)) return;
    seen.add(key);
    clickables.push({ tag: el.tagName.toLowerCase(), role: el.getAttribute("role") || "", text, selector: sel });
  });

  const inputs: { selector: string; type: string; name: string; placeholder: string }[] = [];
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    if (inputs.length >= cap.inputs) return;
    const type = el.getAttribute("type") || el.tagName.toLowerCase();
    if (type === "hidden") return;
    inputs.push({
      selector: selectorFor(el),
      type,
      name: el.getAttribute("name") || "",
      placeholder: clean(el.getAttribute("placeholder")),
    });
  });

  const forms: { selector: string; fields: string[] }[] = [];
  document.querySelectorAll("form").forEach((f) => {
    const fields: string[] = [];
    f.querySelectorAll("input, textarea, select").forEach((el) => {
      const n = el.getAttribute("name") || el.getAttribute("id") || el.getAttribute("type");
      if (n) fields.push(n);
    });
    forms.push({ selector: selectorFor(f), fields });
  });

  const links: { text: string; href: string }[] = [];
  const linkSeen = new Set<string>();
  document.querySelectorAll("a[href]").forEach((a) => {
    if (links.length >= cap.links) return;
    const href = (a as HTMLAnchorElement).href;
    if (!href || href.startsWith("javascript:") || linkSeen.has(href)) return;
    const text = clean((a as HTMLElement).innerText);
    if (!text) return;
    linkSeen.add(href);
    links.push({ text, href });
  });

  const textOutline = clean(document.body ? (document.body as HTMLElement).innerText : "").slice(0, cap.text);

  return {
    url: location.href,
    title: document.title,
    textOutline,
    clickables,
    inputs,
    forms,
    links,
  };
}

/** Capture the current page of an existing Hyperbrowser session. */
export async function captureCurrentSession(wsEndpoint: string): Promise<SiteCapture> {
  const browser = await chromium.connectOverCDP(wsEndpoint);
  try {
    const ctx = browser.contexts()[0] ?? (await browser.newContext());
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    await page.waitForTimeout(500);
    const data = (await page.evaluate(harvest)) as Omit<SiteCapture, "accessibilityTree">;
    const accessibilityTree = await page.locator("body").ariaSnapshot({ timeout: 5_000 }).catch(() => "");
    return { ...data, accessibilityTree };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export interface InspectHandle {
  sessionId: string;
  liveUrl: string | null;
  capture: (url: string) => Promise<SiteCapture>;
  screenshot: () => Promise<string | null>;
  close: () => Promise<void>;
}

/**
 * Open a live-view session and return a handle we can drive. The caller decides
 * what to navigate to and when to close — this keeps session lifecycle explicit.
 */
export async function openInspector(client: Hyperbrowser): Promise<InspectHandle> {
  const session = await client.sessions.create({ viewOnlyLiveView: true, acceptCookies: true });
  const browser = await chromium.connectOverCDP(session.wsEndpoint);

  async function getPage() {
    const ctx = browser.contexts()[0] ?? (await browser.newContext());
    return ctx.pages()[0] ?? (await ctx.newPage());
  }

  return {
    sessionId: session.id,
    liveUrl: session.liveUrl ?? null,
    async capture(url: string): Promise<SiteCapture> {
      const page = await getPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: CONFIG.inspectNavTimeoutMs });
      // Small settle for client-rendered content.
      await page.waitForTimeout(1200);
      const data = (await page.evaluate(harvest)) as Omit<SiteCapture, "accessibilityTree">;
      const accessibilityTree = await page.locator("body").ariaSnapshot({ timeout: 5_000 }).catch(() => "");
      return { ...data, accessibilityTree };
    },
    async screenshot(): Promise<string | null> {
      try {
        const page = await getPage();
        const buf = await page.screenshot({ type: "png" });
        return Buffer.from(buf).toString("base64");
      } catch {
        return null;
      }
    },
    async close() {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
      await client.sessions.stop(session.id).catch(() => undefined);
    },
  };
}
