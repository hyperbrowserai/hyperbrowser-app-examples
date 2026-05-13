# HyperRank

**Is your brand AI-ready?**

Paste a company URL and see how AI search engines describe your brand. HyperRank scrapes the homepage, derives the company's category and competitors, runs buyer-intent prompts through public AI search surfaces, and returns a brutalist visibility scorecard.

Built with [Hyperbrowser](https://hyperbrowser.ai).

## How it works

1. **Scrape** the company homepage with Hyperbrowser's stealth `scrape` API.
2. **Generate** 12 buyer-intent prompts via Claude Opus 4.7 (category, comparison, alternative, and use-case queries).
3. **Query** each prompt against Perplexity and Google AI Overview through Hyperbrowser. (ChatGPT is login-walled and reported as "coming soon" in v1.)
4. **Analyze** all responses with Claude to score visibility, surface competitor wins, citation sources, and factual inaccuracies.
5. **Render** a scorecard you can copy as a 1200×630 share card.

## Setup

```bash
cp .env.example .env.local
# fill in HYPERBROWSER_API_KEY and ANTHROPIC_API_KEY
npm install
npm run dev
```

Open http://localhost:3000.

### Required environment variables

- `HYPERBROWSER_API_KEY` — get one at https://hyperbrowser.ai
- `ANTHROPIC_API_KEY` — get one at https://console.anthropic.com

## Tech

- Next.js 16 (App Router) + React 19 + Tailwind v4
- `@hyperbrowser/sdk` — stealth scraping for both the company homepage and AI search results
- `@anthropic-ai/sdk` (Claude Opus 4.7) — prompt generation + visibility scoring
- `html-to-image` — clipboard-ready share card
- Brutalist visual system (4px black borders, offset drop shadows, Manrope)

## Notes

- Scans take 60–120s. The route streams SSE progress events so the UI stays alive.
- Results are cached in-memory per `(URL, day)` so re-runs of the same URL are instant.
- ChatGPT requires a logged-in session; v1 surfaces it as unavailable rather than faking a result.
- Google AI Overview is region/account-gated; if the scrape fails the Google card reports it cleanly.
