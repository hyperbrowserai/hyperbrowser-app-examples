**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# HyperScript

HyperScript is a local Next.js app for turning a plain-English web task into a real TypeScript HyperAgent script, watching it run in a Hyperbrowser Live View, and keeping the script as a reusable growth automation artifact.

Compatible with Claude Sonnet 5 (coming soon).

## Setup

```bash
git clone <your-repo-url>
cd hyperscript
npm install
cp .env.local.example .env.local
```

Get an API key at [https://hyperbrowser.ai](https://hyperbrowser.ai), then add it to `.env.local`:

```bash
HYPERBROWSER_API_KEY=your_hyperbrowser_key
```

HyperScript uses Hyperbrowser's managed HyperAgent task API, so it does not require your own Anthropic key.

Run the app locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quick Start

Use a public page for your first run:

```text
Task: Go to Hacker News and tell me the title of the top story.
Starting URL: https://news.ycombinator.com
```

HyperScript will show the TypeScript script, embed the Hyperbrowser Live View for the same cloud browser session, and print the agent output when the run finishes.

## Growth Use Case

Use HyperScript to demo repeatable web automations that help prospects see how Hyperbrowser can power sign-up, research, or integration workflows with real browser sessions.

Follow @hyperbrowser for updates.
