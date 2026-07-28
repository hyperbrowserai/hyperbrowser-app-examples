import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { Hyperbrowser } from "@hyperbrowser/sdk";

dotenv.config({ path: ".env.local", quiet: true });

const hyperbrowserKey = process.env.HYPERBROWSER_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const model = "claude-opus-5";

if (!hyperbrowserKey || !anthropicKey) {
  if (!hyperbrowserKey) console.error("Missing HYPERBROWSER_API_KEY in .env.local");
  if (!anthropicKey) console.error("Missing ANTHROPIC_API_KEY in .env.local");
  process.exit(1);
}

async function main() {
  const hyperbrowser = new Hyperbrowser({ apiKey: hyperbrowserKey });
  await hyperbrowser.sessions.getActiveSessionsCount();
  console.log("Hyperbrowser API key: verified");
  if (typeof hyperbrowser.agents.claudeComputerUse.start !== "function") {
    throw new Error("Installed @hyperbrowser/sdk does not expose Claude Computer Use.");
  }
  console.log("Claude Computer Use SDK: verified");

  const anthropic = new Anthropic({ apiKey: anthropicKey, maxRetries: 0 });

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    console.log("Anthropic API key: verified");
    console.log(`Resolved model id: ${response.model}`);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      console.error(`Model "${model}" returned 404. No fallback was attempted.`);
      process.exit(1);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
