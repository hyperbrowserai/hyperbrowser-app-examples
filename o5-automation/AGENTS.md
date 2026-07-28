# Agent notes

- LLM is **Claude Opus 5** via the official Anthropic SDK, model
  `claude-opus-5`. Do not silently substitute another model.
- Generated scripts run in a Hyperbrowser **sandbox** (`node-chromium` image),
  never via `eval` in the Next process. Execution glue is `lib/sandbox.ts`.
- Keys are server-side only. Never log or return them to the client.
