import type { PainCategory, SignalSource } from "./types";

export const toolTerms = [
  "playwright",
  "puppeteer",
  "selenium",
  "captcha",
  "cloudflare",
  "proxy",
  "proxies",
  "scraping",
  "crawler",
  "browser",
  "session",
  "anti-bot",
  "blocked",
  "agent",
  "login",
  "javascript",
  "rendering",
  "extraction",
];

export const painTerms = [
  "blocked",
  "broken",
  "fails",
  "failing",
  "failure",
  "impossible",
  "brittle",
  "pain",
  "hard",
  "slow",
  "retry",
  "captcha",
  "timeout",
  "rate limit",
  "production",
];

export const commercialTerms = [
  "team",
  "production",
  "customer",
  "workflow",
  "scale",
  "infra",
  "infrastructure",
  "monitoring",
  "pipeline",
  "reliability",
  "cost",
  "maintain",
  "deployment",
];

export const hyperbrowserFitTerms = [
  "browser",
  "scraping",
  "crawler",
  "session",
  "captcha",
  "cloudflare",
  "proxy",
  "anti-bot",
  "playwright",
  "puppeteer",
  "javascript",
  "rendering",
  "agent",
  "extraction",
];

export const sourceReliability: Record<SignalSource, number> = {
  github: 0.86,
  hackernews: 0.76,
  reddit: 0.62,
};

export const categoryLabels: Record<PainCategory, string> = {
  anti_bot_reliability: "Anti-bot reliability",
  session_persistence: "Session persistence",
  browser_infra_cost: "Browser infrastructure cost",
  dynamic_js_extraction: "Dynamic JavaScript extraction",
  agent_navigation_failure: "Agent navigation failure",
  proxy_retry_complexity: "Proxy and retry complexity",
  data_quality_extraction: "Data quality and extraction",
  workflow_maintenance: "Workflow maintenance",
  developer_workflow_friction: "Developer workflow friction",
};

export function categorizePain(text: string): PainCategory {
  const lower = text.toLowerCase();

  if (lower.includes("captcha") || lower.includes("cloudflare") || lower.includes("anti-bot")) {
    return "anti_bot_reliability";
  }

  if (lower.includes("session") || lower.includes("cookie") || lower.includes("login")) {
    return "session_persistence";
  }

  if (lower.includes("proxy") || lower.includes("retry") || lower.includes("rate limit")) {
    return "proxy_retry_complexity";
  }

  if (lower.includes("javascript") || lower.includes("render") || lower.includes("spa")) {
    return "dynamic_js_extraction";
  }

  if (lower.includes("agent") || lower.includes("navigate") || lower.includes("click")) {
    return "agent_navigation_failure";
  }

  if (lower.includes("infra") || lower.includes("scale") || lower.includes("fleet")) {
    return "browser_infra_cost";
  }

  if (lower.includes("extract") || lower.includes("schema") || lower.includes("quality")) {
    return "data_quality_extraction";
  }

  if (lower.includes("maintain") || lower.includes("maintenance") || lower.includes("workflow")) {
    return "workflow_maintenance";
  }

  return "developer_workflow_friction";
}

export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
