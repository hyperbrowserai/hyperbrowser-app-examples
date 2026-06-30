function toLiteral(value: string) {
  return JSON.stringify(value);
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function generateScript(taskInput: string, urlInput: string) {
  const task = taskInput.trim();
  const url = normalizeUrl(urlInput);

  if (!task || !url) {
    return "";
  }

  return `import { config } from "dotenv";
import { Hyperbrowser } from "@hyperbrowser/sdk";

config();

async function main() {
  const hyperbrowserApiKey = process.env.HYPERBROWSER_API_KEY;

  if (!hyperbrowserApiKey) {
    throw new Error("Missing HYPERBROWSER_API_KEY.");
  }

  const client = new Hyperbrowser({ apiKey: hyperbrowserApiKey });

  const started = await client.agents.hyperAgent.start({
    version: "1.1.0",
    task: ${toLiteral(`Start at ${url}. ${task}`)},
    llm: "gpt-4o",
    maxSteps: 10,
    sessionOptions: {
      viewOnlyLiveView: true,
      screen: {
        width: 1280,
        height: 720,
      },
    },
  });

  console.log("Live View:", started.liveUrl);

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const result = await client.agents.hyperAgent.get(started.jobId);

    if (
      result.status === "completed" ||
      result.status === "failed" ||
      result.status === "stopped"
    ) {
      console.log(result.data?.finalResult ?? result.error ?? "");
      break;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;
}
