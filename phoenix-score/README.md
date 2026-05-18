# PHOENIXSCORE

Score your tweet with the open-source X algorithm.

PhoenixScore analyzes a draft tweet (or a live tweet URL) against the documented engagement weights from [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) (Phoenix model, released May 2026). It returns a 0-100 score, a weighted breakdown of predicted engagement signals, contextual insights, and concrete suggestions to improve.

## What it does

- Paste draft tweet text and get a draft score before posting.
- Paste an `https://x.com/...` URL and Hyperbrowser fetches the live page via stealth browser, extracts the tweet, and scores it.
- Renders a screenshot-friendly score card with a full breakdown.

## How it works

1. The browser POSTs the input to `/api/score`.
2. If the input is a URL, Hyperbrowser fetches the page in stealth mode and returns markdown. Claude extracts the tweet text from the page content.
3. Claude Sonnet 4 analyzes the tweet against the documented algorithm weights and returns a structured JSON score.
4. The response streams back as Server-Sent Events so the UI can show progress.

## The weights

From the published algorithm:

| Action          | Weight |
| --------------- | ------ |
| Repost          | 20.0x  |
| Quote           | 15.0x  |
| Reply           | 13.5x  |
| Profile click   | 12.0x  |
| Link click      | 11.0x  |
| Bookmark        | 10.0x  |
| Share (DM/link) | 8.0x   |
| Favorite        | 1.0x   |

Negative signals reduce distribution: Not Interested, Mute, Block, Report.

## Setup

```bash
git clone <this repo>
cd phoenix-score
npm install
cp .env.example .env.local
# fill in HYPERBROWSER_API_KEY and ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Environment variables

```
HYPERBROWSER_API_KEY=
ANTHROPIC_API_KEY=
```

## Disclaimer

This uses the published algorithm weights and structure, not the production Phoenix model weights. Scores are directional estimates, not exact predictions.

## Credits

Built with [Hyperbrowser](https://hyperbrowser.ai). Open source.

Reference: [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)
