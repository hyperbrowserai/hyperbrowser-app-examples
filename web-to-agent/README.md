# Web-to-Agent Tool Generator

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

A minimal Next.js application that automatically generates agent tools for interacting with any website. Input a URL and get TypeScript functions that can click buttons, fill forms, extract data, and more.

## Features

- **Real-time Website Analysis**: Uses Hyperbrowser stealth sessions to crawl and analyze websites
- **AI-Powered Tool Generation**: TogetherAI classifies UI elements and generates TypeScript code using AI SDK
- **Live Testing**: Test generated tools directly in the browser with screenshots
- **TypeScript Export**: Download generated tools as production-ready TypeScript code
- **Minimal UI**: Clean, dark-themed interface optimized for developer productivity

## Quick Start

### 1. Get API Keys

You'll need API keys from:
- **Hyperbrowser**: Get yours at https://hyperbrowser.ai
- **TogetherAI**: Sign up at https://together.ai

### 2. Environment Setup

```bash
# Clone and install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Add your API keys to .env.local
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
TOGETHER_API_KEY=your_together_api_key_here
```

### 3. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start generating tools.

## How It Works

1. **Crawl**: Enter a URL → Hyperbrowser creates a stealth session and extracts interactive elements
2. **Map**: TogetherAI analyzes the DOM and classifies elements into actionable tools
3. **Scaffold**: TogetherAI generates TypeScript functions via AI SDK using only official Hyperbrowser methods
4. **Test**: Run tools live with real data and see results with screenshots

## API Endpoints

- `POST /api/crawl` - Extract DOM elements from a URL
- `POST /api/map` - Classify elements into actionable tools
- `POST /api/scaffold` - Generate TypeScript tool functions
- `POST /api/test` - Execute tools live and return results

## Growth Use Case

Perfect for building automation tools that can:
- Auto-generate social media content from scraped data
- Create lead generation tools from business directories
- Build monitoring systems for competitor analysis
- Generate integration tools for SaaS platforms

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** with strict typing
- **Tailwind CSS** for minimal styling
- **Hyperbrowser SDK** for web automation
- **TogetherAI** for element classification
- **Zod** for schema validation

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.