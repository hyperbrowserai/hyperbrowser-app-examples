**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# DESIGNMD

Extract a DESIGN.md from any website. Following Google's open standard.

Paste any domain once you add a Hyperbrowser API key in the browser. DESIGNMD calls **Hyperbrowser `web.fetch` with `formats: ["branding"]` only**, turns the profile into a Google-style DESIGN.md (YAML frontmatter plus narrative sections), and shows a live preview with swatches, type samples, and export actions.

## How it works

1. **Get an API key** at [https://hyperbrowser.ai](https://hyperbrowser.ai) and save it in the tool (localStorage only).
2. Enter a URL like `stripe.com` and hit **Generate**.
3. The Next.js API route runs `web.fetch` server-side and formats the returned branding payload into DESIGN.md you can copy or download.

This is built for growth teams who want **one key, one call, DESIGN.md out**—no OpenAI or Anthropic keys, no secondary LLM step.

## Try it live

`https://designmd.hyperbrowser.ai`

Shareable paths like `https://designmd.hyperbrowser.ai/stripe.com` auto-run once a key is stored.

## Quick start (Hyperbrowser only)

```typescript
import { Hyperbrowser } from "@hyperbrowser/sdk";

// Automation example — configure HYPERBROWSER_API_KEY in your environment.
const client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY! });

const result = await client.web.fetch({
  url: "https://stripe.com",
  outputs: { formats: ["branding"] },
});

const branding = result.data?.branding;
```

```bash
git clone <this-repo>
cd designmd-url
npm install
npm run dev
```

Open `http://localhost:3000`. No `.env` keys are required; users bring their own Hyperbrowser key.

## Spec

See the [Google DESIGN.md specification](https://github.com/google-labs-code/design.md) for the open format this project targets.

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.
