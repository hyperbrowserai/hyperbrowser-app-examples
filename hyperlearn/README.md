**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# HyperLearn

AI agents that train AI coding agents. Watch a browser agent browse live documentation in real time and see skill files generate as the agent discovers knowledge.

## Quick Start

1. **Get an API key** at [hyperbrowser.ai](https://hyperbrowser.ai)

2. Clone and install:

```bash
cd hyperlearn
npm install
```

3. Create `.env.local` with your keys:

```
HYPERBROWSER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

4. Run the dev server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) and enter a topic.

## How It Works

1. Enter a topic (e.g. "kubernetes networking") or a documentation URL
2. A cloud-hosted HyperAgent opens Google, searches for official documentation, and navigates to the top results -- all visible in the live browser preview
3. The agent browses each documentation page, scrolling through and extracting key concepts
4. Extracted content is fed to OpenAI to generate interconnected skill files
5. Skill files appear progressively in the right panel as a file tree and interactive graph
6. Download the complete skill tree as a `.zip` when finished

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- `@hyperbrowser/sdk` -- browser sessions with live view + cloud HyperAgent (handles search + browsing)
- OpenAI API -- skill file generation from extracted documentation
- d3-force -- interactive graph visualization

## Growth Use Case

HyperLearn automates the creation of structured skill files from any documentation source. Feed it a topic, and it produces a ready-to-use knowledge graph that AI coding agents can consume -- turning hours of manual documentation reading into minutes of automated extraction.

---

Follow @hyperbrowser for updates.
