# Pitch Deck Generator

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

A Next.js application that turns any company website into a professional startup pitch deck PDF and JSON.

## Features

- Scrapes website content using Hyperbrowser's powerful SDK
- Generates structured pitch deck content with OpenAI
- Creates professionally formatted PDF pitch decks
- Supports multiple themes: modern, dark, and neon
- Downloads both PDF and JSON formats
- Sends generated pitch decks to Slack (optional)

## Quick Start

### Get an API key

Sign up for an API key at [https://hyperbrowser.ai](https://hyperbrowser.ai)

### Environment Setup

Create a `.env.local` file with the following variables:

```
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
SLACK_WEBHOOK_URL=your_slack_webhook_url_here  # Optional
```

### Installation

```bash
npm install
npm run dev
```

### Usage

1. Enter a company website URL
2. Select a theme (modern, dark, or neon)
3. Click "Generate Pitch Deck"
4. View the generated pitch deck content
5. Download as PDF or JSON

## API Reference

### `POST /api/pitchdeck`

Generates a pitch deck from a URL.

**Request Body:**

```json
{
  "url": "https://example.com",
  "theme": "modern" // Optional: "modern", "dark", or "neon"
}
```

**Response:**

```json
{
  "pitch": {
    "company": "Company Name",
    "one_liner": "One sentence description",
    "problem": ["Problem point 1", "Problem point 2", ...],
    "solution": ["Solution point 1", "Solution point 2", ...],
    // Other pitch deck sections...
  },
  "pdfBase64": "base64-encoded-pdf-data",
  "filename": "company-name-pitch-deck.pdf"
}
```

## Growth Use Case

This tool helps startups quickly generate professional pitch decks for investor meetings, saving hours of design work and content creation. It's perfect for founders who need to quickly communicate their value proposition and business model.

---

Follow [@hyperbrowser](https://twitter.com/hyperbrowser) for updates.