# Human Fallback — Scrape Any Page with a Human Safety Net

Scrape any webpage using [Hyperbrowser](https://hyperbrowser.ai). When automation is blocked by CAPTCHAs, login walls, or other anti-bot measures, the app automatically falls back to [Human Pages](https://humanpages.ai) to hire a real person to complete the task.

## Features

- **Automated-first**: Hyperbrowser stealth browser handles most pages instantly
- **Smart detection**: Detects CAPTCHAs, Cloudflare challenges, login walls, and empty responses
- **Human fallback**: When automation fails, hires a real human via the Human Pages API
- **Live progress**: Real-time step-by-step status updates streamed to the UI
- **Workflow visualization**: See exactly which path (bot or human) resolved your request

## How It Works

1. You enter a URL and click **Scrape**
2. The app launches a stealth Hyperbrowser session and navigates to the page
3. If the page loads successfully, the extracted text is returned immediately
4. If the page is blocked (CAPTCHA, login wall, etc.), the app:
   - Searches Human Pages for available humans with web task skills
   - Creates a job offer with a description of what to scrape
   - Polls for completion and returns the result when the human finishes

## Getting Started

1. **Get Your API Keys**
   - [Hyperbrowser](https://hyperbrowser.ai) — sign up and get an API key
   - [Human Pages](https://humanpages.ai) — register an agent and get an agent key

2. **Setup**
   ```bash
   # Install dependencies
   npm install

   # Create .env.local with your keys
   cat > .env.local << EOF
   HYPERBROWSER_API_KEY=your_hyperbrowser_key_here
   HUMANPAGES_API_KEY=your_humanpages_key_here
   EOF

   # Start the dev server
   npm run dev
   ```

3. **Open** `http://localhost:3000` and enter a URL to scrape.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `HYPERBROWSER_API_KEY` | Yes | Your Hyperbrowser API key |
| `HUMANPAGES_API_KEY` | No | Your Human Pages agent key (enables human fallback) |

The app works without `HUMANPAGES_API_KEY` — it will just skip the human fallback step and report that the scrape failed.

## Human Pages API

This example uses the Human Pages REST API:

| Endpoint | Method | Description |
|---|---|---|
| `/api/humans/search?skill=web+task&available=true` | GET | Find available humans |
| `/api/jobs` | POST | Create a job offer |
| `/api/jobs/{jobId}` | GET | Check job status |
| `/api/jobs/{jobId}/messages` | GET | Read job messages |

All requests use the `X-Agent-Key` header for authentication.

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** for styling
- **@hyperbrowser/sdk** + **puppeteer-core** for browser automation
- **Human Pages REST API** for human fallback
- **Server-Sent Events** for real-time progress streaming
