import { getAnthropic } from "./anthropic";
import type { AgentName, Scan, Scorecard } from "./types";
import { AGENT_LABELS, AGENT_ORDER } from "./types";

const FALLBACK_AGENT = {
  passed: false,
  steps: 0,
  summary: "No data returned from agent.",
};

function buildFallback(scan: Scan): Scorecard {
  const agents: Record<AgentName, { passed: boolean; steps: number; summary: string }> = {
    claude: { ...FALLBACK_AGENT },
    openai: { ...FALLBACK_AGENT },
    gemini: { ...FALLBACK_AGENT },
  };
  let passed = 0;
  for (const name of AGENT_ORDER) {
    const r = scan.results[name];
    if (!r) continue;
    const ok = r.status === "completed";
    if (ok) passed += 1;
    agents[name] = {
      passed: ok,
      steps: r.steps ?? 0,
      summary: ok
        ? r.output?.slice(0, 220) || "Completed the task."
        : r.error?.slice(0, 220) || "Did not complete.",
    };
  }
  const score = Math.round((passed / AGENT_ORDER.length) * 100);
  return {
    score,
    verdict: `${passed} of ${AGENT_ORDER.length} agents completed the task.`,
    agents,
    issues: [],
    recommendations: [],
  };
}

export async function judgeResults(scan: Scan): Promise<Scorecard> {
  const anthropic = getAnthropic();

  const resultsText = AGENT_ORDER.map((name) => {
    const r = scan.results[name];
    const label = AGENT_LABELS[name];
    if (!r) return `${label}: no result`;
    return `${label}: status=${r.status} | steps=${r.steps ?? "n/a"} | ${
      r.status === "completed"
        ? `output=${(r.output || "").slice(0, 400)}`
        : `error=${(r.error || "").slice(0, 400)}`
    }`;
  }).join("\n");

  const prompt = `You are an AI agent operability judge. Three browser agents tried to complete a task on a website. Evaluate how agent-ready the site is.

URL: ${scan.url}
Task: ${scan.task}

Agent results:
${resultsText}

Return ONLY a JSON object (no markdown, no backticks, no preamble):
{
  "score": <0-100 overall agent operability score>,
  "verdict": "<one sentence verdict, no em dashes>",
  "agents": {
    "claude": { "passed": <true/false>, "steps": <number>, "summary": "<one sentence>" },
    "openai": { "passed": <true/false>, "steps": <number>, "summary": "<one sentence>" },
    "gemini": { "passed": <true/false>, "steps": <number>, "summary": "<one sentence>" }
  },
  "issues": [
    { "severity": "critical" | "warning" | "info", "label": "<short>", "detail": "<one sentence>", "fix": "<one sentence>" }
  ],
  "recommendations": ["<specific actionable recommendation>"]
}

Scoring guide:
- 90-100: All 3 agents completed. Site is fully agent-operable.
- 60-89: 2 agents completed. Some barriers.
- 30-59: 1 agent completed. Major operability issues.
- 0-29: No agents completed. Site is effectively agent-proof.

Be specific about what broke. Reference exact UI elements, modals, forms, navigation patterns that caused failures. Do not use em dashes. Use periods or commas.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Scorecard;
    return parsed;
  } catch {
    return buildFallback(scan);
  }
}
