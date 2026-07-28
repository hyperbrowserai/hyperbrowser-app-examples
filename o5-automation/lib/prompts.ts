import type { DomainMemory, EnvFactKind } from "./memory";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MemoryDelta {
  selectors?: Array<{
    selector?: string;
    resolvedTo?: string;
    purpose?: string;
    pageUrl?: string;
  }>;
  navPaths?: Array<{ goal?: string; urls?: string[]; params?: string }>;
  flows?: Array<{ name?: string; steps?: string[] }>;
  structureNote?: string;
  repairs?: Array<{ error?: string; failedApproach?: string; fix?: string }>;
  envFacts?: Array<{ kind?: EnvFactKind; detail?: string }>;
  reused?: {
    selectors?: string[];
    navPaths?: string[];
    flows?: string[];
    repairs?: Array<{ error?: string; fix?: string }>;
  };
  staleSelectors?: string[];
}

function truncate(value: string, cap: number): string {
  if (value.length <= cap) return value;
  return `${value.slice(0, cap)}\n… [truncated ${value.length - cap} chars]`;
}

// ── Safety / intent gate ────────────────────────────────────────────────────

export function buildPlannerMessages(task: string, url: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a safety and intent gate for a browser agent. Reply with STRICT JSON only:
{"allowed": boolean, "reason": string, "plan": string}
Set "allowed": false only for clearly abusive tasks: credential stuffing, scraping personal data at scale, defeating auth or paywalls the user does not own, spam, or mass account creation. Ordinary research and browser tasks are allowed. "plan" is one concise sentence.`,
    },
    { role: "user", content: `TASK: ${task}\nTARGET URL: ${url}` },
  ];
}

// ── Portable context injected before the agent starts ───────────────────────

/** Render the documented JSON memory as compact, agent-readable context. */
export function renderMemory(memory: DomainMemory): string {
  const lines = [
    `DOMAIN MEMORY: ${memory.domain}`,
    `PROVENANCE: ${memory.runHistory.length} prior run(s), updated ${new Date(memory.updatedAt).toISOString()}`,
  ];

  if (memory.navPaths.length) {
    lines.push("\nNAVIGATION PATHS:");
    for (const entry of memory.navPaths) {
      lines.push(`- ${entry.goal}: ${entry.urls.join(" -> ")}`);
      if (entry.params) lines.push(`  params/filters: ${entry.params}`);
      lines.push(`  provenance: ${entry.runs} successes, ${entry.reused} reuses`);
    }
  }

  if (memory.selectors.length) {
    lines.push("\nINTERACTIVE ELEMENTS:");
    for (const entry of memory.selectors) {
      lines.push(
        `- ${entry.selector}: ${entry.purpose || entry.resolvedTo || "interactive element"}`
      );
      lines.push(`  page: ${entry.pageUrl}; ${entry.runs} successes, ${entry.reused} reuses`);
    }
  }

  if (memory.flows.length) {
    lines.push("\nFLOWS:");
    for (const entry of memory.flows) {
      lines.push(`- ${entry.name}: ${entry.steps.join(" -> ")}`);
      lines.push(`  provenance: ${entry.runs} successes, ${entry.reused} reuses`);
    }
  }

  if (memory.repairs.length) {
    lines.push("\nFAILURES AND FIXES — apply these fixes up front:");
    for (const entry of memory.repairs) {
      lines.push(`- failed: ${entry.error}`);
      if (entry.failedApproach) lines.push(`  approach: ${entry.failedApproach}`);
      lines.push(`  fix: ${entry.fix}`);
      lines.push(`  provenance: ${entry.runs} observations, ${entry.reused} reuses`);
    }
  }

  if (memory.envFacts.length) {
    lines.push("\nENVIRONMENT FACTS:");
    for (const entry of memory.envFacts) {
      lines.push(`- [${entry.kind}] ${entry.detail}`);
    }
  }

  return lines.join("\n");
}

/**
 * Build the task passed directly to Hyperbrowser Claude Computer Use. Memory is
 * context, not authority: the agent must verify it while acting and report
 * stale entries honestly in its ordinary reasoning.
 */
export function buildComputerUseTask(
  task: string,
  targetUrl: string,
  memory: DomainMemory | null
): string {
  const memoryBlock = memory
    ? `\n\nUse the following portable navigation memory before exploring. Reuse entries when they still work. If an entry is stale, do not force it; derive a replacement and state what changed.\n\n${renderMemory(memory)}`
    : "\n\nThere is no memory for this domain. This is an exploration run: inspect the site and complete the task from first principles.";

  return `Start at ${targetUrl}.

USER TASK:
${task}
${memoryBlock}

While working, be explicit in your reasoning about URLs visited, controls or accessible labels used, multi-step flows, dead ends, fixes, authentication, captchas, proxy blocks, or stealth requirements. Do not claim a remembered item was reused unless you actually used it successfully. Complete the user's task and return the real result.`;
}

// ── Extract portable memory from measured Computer Use evidence ─────────────

export function buildMemoryDeltaMessages(input: {
  task: string;
  targetUrl: string;
  memory: DomainMemory | null;
  evidence: string;
  finalResult?: string;
  terminal: boolean;
}): ChatMessage[] {
  const known = input.memory ? renderMemory(input.memory) : "NO PRIOR MEMORY";
  const final = input.finalResult
    ? `\nFINAL AGENT RESULT:\n${truncate(input.finalResult, 4_000)}`
    : "";

  return [
    {
      role: "system",
      content: `Extract portable navigation memory from Claude Computer Use evidence. Reply with STRICT JSON only:
{
  "selectors":[{"selector":string,"resolvedTo":string,"purpose":string,"pageUrl":string}],
  "navPaths":[{"goal":string,"urls":[string],"params":string}],
  "flows":[{"name":string,"steps":[string]}],
  "structureNote":string,
  "repairs":[{"error":string,"failedApproach":string,"fix":string}],
  "envFacts":[{"kind":"stealth_required"|"captcha"|"proxy_blocked"|"login_required"|"other","detail":string}],
  "reused":{"selectors":[string],"navPaths":[string],"flows":[string],"repairs":[{"error":string,"fix":string}]},
  "staleSelectors":[string]
}

Rules:
- Extract only facts directly evidenced in the supplied agent steps. Empty arrays are correct.
- "selectors" may contain a CSS selector only when the evidence shows one. Otherwise use an accessible label such as role=button name="Search". Never invent DOM selectors from coordinates.
- A navigation path is a URL sequence the agent actually traversed. Preserve query params and filters.
- A flow is an ordered reusable action sequence, not a narrative summary.
- A repair requires both a concrete failure/dead end and the approach that resolved it.
- Environment facts require direct evidence.
- "reused" must exactly name PRIOR MEMORY entries demonstrably used successfully in this evidence.
- "staleSelectors" must exactly name prior selectors/labels that failed.
- On non-terminal evidence, extract only the new facts visible in this batch.
- Never put credentials, API keys, cookies, or user-entered secret values in memory.`,
    },
    {
      role: "user",
      content: `TASK: ${input.task}
TARGET URL: ${input.targetUrl}
TERMINAL BATCH: ${input.terminal}

PRIOR MEMORY:
${truncate(known, 12_000)}

COMPUTER USE EVIDENCE:
${truncate(input.evidence, 14_000)}
${final}

Extract the measured memory delta now.`,
    },
  ];
}
