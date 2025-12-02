# AI Research Tool

Powered by **Hyperbrowser** + **Claude Opus 4.5**

A powerful multi-URL research tool that uses AI to analyze and synthesize information across multiple web sources.

## Features

- 🔍 **Multi-URL Analysis**: Scrape and analyze multiple websites simultaneously
- 🤖 **Claude Opus 4.5**: Uses Anthropic's latest and most capable AI model
- 📊 **Visual Comparisons**: Auto-generated comparison tables and charts
- 💡 **AI Synthesis**: Get comprehensive insights across all sources
- 🎯 **Research Questions**: Ask specific questions to guide the analysis

## Getting Started

### Prerequisites

- Node.js 18+ 
- [Hyperbrowser API key](https://hyperbrowser.ai) (required)
- [Anthropic API key](https://console.anthropic.com/settings/keys) (recommended for Claude Opus 4.5)

### Installation

```bash
npm install
```

### Setup API Keys

1. Copy `.env.example` to `.env.local`
2. Add your API keys:
   - **Hyperbrowser API Key**: Get from [hyperbrowser.ai](https://hyperbrowser.ai)
   - **Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com/settings/keys)

Or add them directly in the app via Settings (⚙️ icon)

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Add URLs**: Enter 2-10 URLs you want to analyze
2. **Research Question** (optional): Add a specific question like "Compare pricing and features"
3. **Click Research**: The tool will:
   - Scrape all URLs using Hyperbrowser
   - Analyze content with Claude Opus 4.5
   - Generate AI synthesis and visual comparisons
4. **View Results**: See insights, comparison tables, and source links

## Example Use Cases

- **Competitor Analysis**: Compare features, pricing, and positioning
- **Market Research**: Analyze trends across industry websites
- **Product Comparison**: Evaluate multiple products side-by-side
- **Content Research**: Gather insights from multiple articles/blogs
- **Due Diligence**: Research multiple aspects of a company

## Tech Stack

- **Next.js 16** - React framework
- **Hyperbrowser SDK** - Web scraping and browser automation
- **Anthropic Claude Opus 4.5** - AI analysis and synthesis
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling

## API Endpoints

- `POST /api/research` - Multi-URL research and analysis

## License

MIT
