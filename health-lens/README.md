**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# HealthLens

Upload lab reports, chat with AI, get research-backed health insights.

## Setup

**Get an API key** at https://hyperbrowser.ai

Install and configure:

```bash
npm install
```

Create `.env`:

```env
HYPERBROWSER_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

Run:

```bash
npm run dev
```

Open http://localhost:3000

## How It Works

1. Upload PDF lab report
2. AI extracts health markers (cholesterol, glucose, etc.)
3. Searches PubMed API for relevant research
4. Chat about your results with research context

## Tech

- Next.js 16 + TypeScript
- Anthropic Claude Sonnet 4.5
- PubMed E-utilities API
- Hyperbrowser SDK (for article scraping)
- localStorage (no database)

## Disclaimer

Informational only. Not medical advice. Consult your doctor.

---

Follow @hyperbrowser for updates.
