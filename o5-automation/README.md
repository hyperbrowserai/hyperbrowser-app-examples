**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# Browser Agent Navigation Memory

A local, portable navigation-memory layer for browser agents. Claude Computer
Use completes a real task in a Hyperbrowser cloud browser, while the app records
the paths, controls, flows, failures, fixes, and environment facts that should
make the next visit to that domain faster and more reliable.

Growth use-case: turn one successful browser workflow into reusable site
knowledge that improves every future agent integration.

## Get an API key

1. Get a Hyperbrowser API key at https://hyperbrowser.ai.
2. Get an Anthropic API key with access to `claude-opus-5`.
3. Copy the environment template:

```bash
cp .env.example .env.local
```

```dotenv
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Both keys are server-side only. The Anthropic key is passed to Hyperbrowser's
Claude Computer Use API through its documented custom-key field and is never
sent to the browser client.

## Quick start

```bash
npm install
npm run preflight
npm run dev
```

Open http://localhost:3000, enter a natural-language task and target URL, then
watch the agent and memory update through the instrument-panel UI.

## The loop

1. Resolve the target domain and load `.memory/<domain>.json`.
2. Inject existing memory into the agent context, or mark the run as exploration.
3. Start `client.agents.claudeComputerUse` with `claude-opus-5` and stream its
   Hyperbrowser Live View.
4. Record measured actions and extract evidence-backed memory while the agent runs.
5. Save the updated domain document atomically.
6. On repeat runs, report exactly what was reused, what was stale, and the
   measured difference from the first run.

The app uses the official `@hyperbrowser/sdk` API directly. It does not generate
or execute automation scripts and does not use `eval` or a code sandbox.

## Portable memory schema

Each domain is stored as versioned JSON at `.memory/<domain>.json`:

```json
{
  "version": 2,
  "domain": "example.com",
  "createdAt": 1785260000000,
  "updatedAt": 1785261000000,
  "selectors": [
    {
      "selector": "role=button name=\"Search\"",
      "resolvedTo": "Search button",
      "purpose": "Submit the site search",
      "pageUrl": "https://example.com/search",
      "lastSucceededAt": 1785261000000,
      "runs": 2,
      "reused": 1
    }
  ],
  "navPaths": [
    {
      "goal": "Open daily TypeScript trends",
      "urls": ["https://example.com/trending", "https://example.com/trending/typescript?since=daily"],
      "params": "language=typescript; since=daily",
      "lastSucceededAt": 1785261000000,
      "runs": 2,
      "reused": 1
    }
  ],
  "flows": [
    {
      "name": "Search",
      "steps": ["Open search", "Enter query", "Submit", "Wait for results"],
      "lastSucceededAt": 1785261000000,
      "runs": 2,
      "reused": 1
    }
  ],
  "structureNotes": [],
  "repairs": [
    {
      "error": "Search icon did not expose a text label",
      "failedApproach": "Find button by visible text",
      "fix": "Use its accessible name Search",
      "at": 1785261000000,
      "runs": 1,
      "reused": 0
    }
  ],
  "envFacts": [],
  "runHistory": []
}
```

`selectors` represents interactive elements and may contain either a real CSS
selector or an accessible locator such as `role=button name="Search"`. Every
entry carries provenance (`lastSucceededAt` or `at`, `runs`, and `reused`).

Files are capped by `MEMORY_MAX_BYTES` (64 KB by default). The least-reused,
oldest entries are evicted first. `repairs`—failures and their working
fixes—are never evicted, even if preserving them makes a file exceed the cap.

Credentials, API keys, cookies, and secret form values are never memory fields.

## Consume memory from another agent

Read the file directly:

```typescript
import { readFile } from "node:fs/promises";

const memory = JSON.parse(
  await readFile(".memory/example.com.json", "utf8"),
);

const agentContext = `Known navigation memory:\n${JSON.stringify(memory)}`;
```

Or fetch the same portable document:

```typescript
const memory = await fetch(
  "http://localhost:3000/api/memory/example.com",
).then((response) => response.json());
```

The UI's **Export JSON** button downloads this exact document.

## Configuration

```dotenv
# Optional
COMPUTER_USE_MAX_STEPS=20
COMPUTER_USE_TIMEOUT_MINUTES=5
MEMORY_MAX_BYTES=64000
```

`npm run preflight` verifies the Hyperbrowser key, confirms the installed SDK
exposes Claude Computer Use, makes a real one-token Anthropic request, and
prints the resolved model ID. It stops with a clear error if
`claude-opus-5` does not resolve.

Follow @hyperbrowser for updates.
