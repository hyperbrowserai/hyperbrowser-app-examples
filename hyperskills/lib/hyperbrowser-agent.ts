import { Hyperbrowser } from "@hyperbrowser/sdk";

function getClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not configured");
  }
  return new Hyperbrowser({ apiKey });
}

export async function createAgentSession(): Promise<{
  sessionId: string;
  liveUrl: string;
}> {
  const client = getClient();
  const session = await client.sessions.create({});
  const detail = await client.sessions.get(session.id, {
    liveViewTtlSeconds: 600,
  });

  if (!detail.liveUrl) {
    throw new Error("Failed to obtain live view URL from Hyperbrowser session");
  }

  return {
    sessionId: session.id,
    liveUrl: detail.liveUrl,
  };
}

const MAX_PAGES = 18;

function buildAutoModeTask(topic: string, urls: string[]): string {
  const urlList = urls.map((u, i) => `${i + 1}. ${u}`).join("\n");

  return `You are researching: "${topic}".

Use these URLs as your starting points (from a documentation-focused web search). Visit each one. From every page, follow links that stay on-topic (official docs, guides, API references, tutorials) and deepen coverage of "${topic}".

Rules:
- Visit at most ${MAX_PAGES} distinct pages total (count every unique URL you load).
- Prefer official vendor or project documentation over forums or random blogs.
- Scroll each page enough to capture real content, not just headers.

Seed URLs:
${urlList}

After you finish browsing, return ONE comprehensive JSON object (no markdown outside the JSON) with this structure:
{
  "pages": [
    {
      "url": "the page URL",
      "title": "the page title",
      "concepts": [
        {
          "name": "concept name",
          "description": "detailed description",
          "codeExamples": ["code snippet 1"],
          "relatedConcepts": ["related concept 1"]
        }
      ]
    }
  ]
}

Extract real text and real code from the pages. Do not invent APIs or examples.`;
}

export async function startAutoBrowsingTask(
  sessionId: string,
  topic: string,
  urls: string[]
): Promise<string> {
  const client = getClient();
  const task = buildAutoModeTask(topic, urls);

  const response = await client.agents.hyperAgent.start({
    task,
    sessionId,
    keepBrowserOpen: true,
    llm: "gpt-4o",
  });

  return response.jobId;
}

export interface AgentPollResult {
  status: "pending" | "running" | "completed" | "failed" | "stopped";
  stepsCompleted: number;
  finalResult: string | null;
  currentThoughts: string | null;
  error: string | null;
}

export async function pollHyperAgentJob(jobId: string): Promise<AgentPollResult> {
  const client = getClient();
  const result = await client.agents.hyperAgent.get(jobId);

  let stepsCompleted = 0;
  let currentThoughts: string | null = null;

  if (result.data?.steps && Array.isArray(result.data.steps)) {
    stepsCompleted = result.data.steps.length;
    const lastStep = result.data.steps[result.data.steps.length - 1];
    if (lastStep && "agentOutput" in lastStep) {
      const output = lastStep.agentOutput as unknown as Record<string, string>;
      currentThoughts = output.thoughts || output.nextGoal || null;
    }
  }

  return {
    status: result.status,
    stepsCompleted,
    finalResult: result.data?.finalResult ?? null,
    currentThoughts,
    error: result.error ?? null,
  };
}

export async function stopHyperAgentJob(jobId: string): Promise<void> {
  const client = getClient();
  try {
    await client.agents.hyperAgent.stop(jobId);
  } catch {
    // Task may already be finished
  }
}

export async function stopAgentSession(sessionId: string): Promise<void> {
  const client = getClient();
  try {
    await client.sessions.stop(sessionId);
  } catch {
    // Session may already be closed
  }
}

/** Scrape a single URL and return its markdown content. Returns null on failure. */
export async function scrapeUrl(url: string): Promise<string | null> {
  const client = getClient();
  try {
    const result = await client.scrape.startAndWait({
      url,
      scrapeOptions: { formats: ["markdown"] },
    });
    return result.data?.markdown ?? null;
  } catch {
    return null;
  }
}
