**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# Hyperfetch

A Next.js app that turns any URL into a structured intelligence brief: Hyperbrowser captures the live page as markdown (and outbound links); Claude organizes facts, stats, tables, code snippets, entities, and citations in one shareable dashboard.

## Features

- Real page fetch via Hyperbrowser `web.fetch` (markdown + links), not pasted or mocked content
- Server-streamed steps so progress is visible while fetch and enrichment run
- Structured output: summary, key facts, stats, tables, code blocks, entities, and categorized links

## Quick Start

1. **Get an API key** at [hyperbrowser.ai](https://hyperbrowser.ai)

2. **Clone and install:**
   ```bash
   git clone https://github.com/hyperbrowserai/hyperbrowser-app-examples
   cd hyperfetch
   npm install
   ```

3. **Set up environment variables:**  
   Create a `.env.local` file:

   ```
   HYPERBROWSER_API_KEY=your_hyperbrowser_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000), paste a URL, and run an analysis.

## How It Works

1. **Submit a URL** — The UI posts to `/api/analyze`.
2. **Fetch** — Hyperbrowser loads the page and returns markdown plus discovered links.
3. **Enrich** — Anthropic turns the markdown into typed fields (facts, tables, entities, etc.).
4. **Stream** — The API streams progress steps and final JSON to the browser.

## Growth Use Case

Use it as a signup magnet for “instant page teardowns”: drop a competitor or pricing URL, ship a credible brief to sales or content in seconds, then invite teams to automate the same workflow with their own Hyperbrowser + model keys.

## Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.
