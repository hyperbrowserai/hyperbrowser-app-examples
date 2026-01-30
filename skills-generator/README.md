# HyperSkill

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

HyperSkill is a Next.js application that automatically generates SKILL.md files for AI coding agents using real-time web data. Simply enter a topic or URL, and HyperSkill will search, scrape, and generate comprehensive skill documentation.

## What it does

HyperSkill automates the creation of structured SKILL.md files by:
1. Searching the web for relevant content (via Serper API)
2. Scraping and extracting key information (via Hyperbrowser SDK)
3. Generating well-formatted skill documentation (via OpenAI GPT-4o)

## Use Case

**Auto-generate AI agent skills from any documentation.** Whether you're building coding assistants, automation tools, or AI workflows, HyperSkill helps you quickly create structured knowledge bases from web sources. Perfect for growth teams, developers, and AI builders who need to rapidly onboard new capabilities.

## Quick Start

### Prerequisites

You'll need API keys from:
- [Hyperbrowser](https://hyperbrowser.ai) - for web scraping
- [Serper](https://serper.dev) - for web search
- [OpenAI](https://platform.openai.com) - for content generation

### Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd skills-generator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Add your API keys to `.env`:
```env
SERPER_API_KEY=your_serper_key
HYPERBROWSER_API_KEY=your_hyperbrowser_key
OPENAI_API_KEY=your_openai_key
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Enter a topic** (e.g., "Hyperbrowser web scraping") or **paste a URL**
2. Click **Generate SKILL.md**
3. Wait while HyperSkill:
   - Searches for relevant sources
   - Scrapes content using Hyperbrowser
   - Generates structured documentation
4. **Preview** the generated SKILL.md
5. **Copy** to clipboard or **Download** as a file

## Example: Using Hyperbrowser SDK

Here's how HyperSkill uses the Hyperbrowser SDK to scrape web content:

```typescript
import { Hyperbrowser } from "@hyperbrowser/sdk";

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
});

const result = await client.scrape.startAndWait({
  url: "https://example.com",
  scrapeOptions: {
    formats: ["markdown"],
    onlyMainContent: true,
  },
});

// Extract clean markdown content
const markdown = result.markdown;
```

## Tech Stack

- **Next.js 14** - App router, TypeScript
- **Tailwind CSS** - Styling
- **Hyperbrowser SDK** - Web scraping
- **Serper API** - Web search
- **OpenAI GPT-4o** - Content generation
- **Lucide React** - Icons
- **React Markdown** - Markdown preview

## Features

- Clean, minimal black and white UI
- Real-time content generation
- Markdown preview with syntax highlighting
- One-click copy to clipboard
- Download as .md file
- No database required
- Serverless API routes

## Project Structure

```
skills-generator/
├── app/
│   ├── api/generate/route.ts  # API endpoint
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main UI
├── components/
│   ├── input-section.tsx      # Topic/URL input
│   ├── preview-section.tsx    # Markdown preview
│   └── action-buttons.tsx     # Copy/Download buttons
├── lib/
│   ├── serper.ts              # Search integration
│   ├── hyperbrowser.ts        # Scraping logic
│   └── openai.ts              # SKILL.md generation
└── types/
    └── index.ts               # TypeScript types
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SERPER_API_KEY` | API key from serper.dev | Yes |
| `HYPERBROWSER_API_KEY` | API key from hyperbrowser.ai | Yes |
| `OPENAI_API_KEY` | API key from platform.openai.com | Yes |

## License

MIT

---

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.
