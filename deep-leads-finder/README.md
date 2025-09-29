**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# HyperLeads

AI-powered lead research tool that finds relevant business contacts across multiple platforms with real-time progress tracking and precision filtering.

## Features

- **Multi-Source Research**: Automatically searches Yelp, Google Maps, Yellow Pages, and more
- **Live Progress**: Real-time console and progress bar for visibility into the search process
- **AI Filtering**: Claude-powered relevance verification ensures only matching results
- **CSV Export**: One-click export of all leads with contact information
- **Fast Performance**: Optimized with parallel processing and session reuse

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** for minimal, clean UI
- **Framer Motion** for smooth animations
- **Hyperbrowser SDK** for web scraping and data extraction
- **Anthropic Claude API** for relevance filtering

## Quick Start

### 1. Get API Keys

Get your API keys from:
- [Hyperbrowser](https://hyperbrowser.ai)
- [Anthropic](https://console.anthropic.com)

### 2. Environment Setup

Create a `.env.local` file with your API keys:

```bash
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Examples

Search for specific business types in your target location:

- "wedding photographers in New York"
- "real estate agents in Miami"
- "marketing agencies in Chicago"
- "financial advisors in Los Angeles"

The app will search across multiple platforms, filter for relevance, and provide you with a list of leads including business names, locations, and contact information.

## Project Structure

- `app/` - Next.js app router components and API routes
- `components/` - Reusable UI components
- `lib/` - Core functionality including:
  - `deep-research.ts` - Main Hyperleads research engine using Hyperbrowser
  - `session-cache.ts` - Performance optimization for browser sessions
  - `claude-filter.ts` - Claude-powered relevance filtering
  - `csv.ts` - Export functionality

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.
