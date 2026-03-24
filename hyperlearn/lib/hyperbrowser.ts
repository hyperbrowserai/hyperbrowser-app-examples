import { Hyperbrowser } from "@hyperbrowser/sdk";

function getClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not configured");
  }
  return new Hyperbrowser({ apiKey });
}

export async function createSession(): Promise<{
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

export async function startBrowsingTask(
  sessionId: string,
  input: { topic: string } | { urls: string[] }
): Promise<string> {
  const client = getClient();

  let task: string;

  if ("topic" in input) {
    task = `Go to https://www.google.com and search for "${input.topic} official documentation". From the search results, pick the top 3-4 most relevant official documentation pages and visit each one. For each page, scroll through the content carefully and extract the page title, all key concepts with detailed descriptions, any code examples you find, and related topics or links to other concepts.

After visiting ALL pages, return a comprehensive JSON summary of everything you found. The JSON should have this structure:
{
  "pages": [
    {
      "url": "the page URL",
      "title": "the page title",
      "concepts": [
        {
          "name": "concept name",
          "description": "detailed description",
          "codeExamples": ["code snippet 1", "code snippet 2"],
          "relatedConcepts": ["related concept 1", "related concept 2"]
        }
      ]
    }
  ]
}

Be thorough. Extract real content from the pages, not summaries. Include actual code examples exactly as they appear.`;
  } else {
    const urlList = input.urls.map((u, i) => `${i + 1}. ${u}`).join("\n");

    task = `Visit the following documentation URLs one by one. For each page, scroll through the content carefully and extract the page title, all key concepts with detailed descriptions, any code examples you find, and related topics or links to other concepts.

URLs to visit:
${urlList}

After visiting ALL pages, return a comprehensive JSON summary of everything you found. The JSON should have this structure:
{
  "pages": [
    {
      "url": "the page URL",
      "title": "the page title",
      "concepts": [
        {
          "name": "concept name",
          "description": "detailed description",
          "codeExamples": ["code snippet 1", "code snippet 2"],
          "relatedConcepts": ["related concept 1", "related concept 2"]
        }
      ]
    }
  ]
}

Be thorough. Extract real content from the pages, not summaries. Include actual code examples exactly as they appear.`;
  }

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

export async function pollTaskStatus(jobId: string): Promise<AgentPollResult> {
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

export async function stopSession(sessionId: string): Promise<void> {
  const client = getClient();
  try {
    await client.sessions.stop(sessionId);
  } catch {
    // Session may already be closed
  }
}
