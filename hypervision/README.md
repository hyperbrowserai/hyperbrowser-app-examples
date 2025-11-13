# HyperVision

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

HyperVision is a futuristic web application that visualizes how AI perceives and understands webpages. Using the Hyperbrowser API, it extracts semantic data from any URL and renders it as an interactive neural graph with real-time analysis.

## Features

- Real-time webpage analysis using Hyperbrowser API
- Split-view interface: target webpage + AI perception visualization
- Interactive force-directed graph showing semantic relationships
- Live reasoning trace displaying AI's analytical process
- Minimal black and white cyber aesthetic
- Smooth animations powered by Framer Motion

## Get Started

### Prerequisites

- Node.js 18+ installed
- A Hyperbrowser API key from https://hyperbrowser.ai

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file in the root directory:

```env
HYPERBROWSER_API_KEY=your_api_key_here
```

Get your API key at https://hyperbrowser.ai

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

1. Enter any URL in the input field at the top
2. Click "ANALYZE" to trigger the AI perception analysis
3. Watch as HyperVision:
   - Loads the target webpage in the left viewport
   - Extracts semantic data using Hyperbrowser
   - Renders an interactive neural graph
   - Displays real-time reasoning traces
4. Interact with the graph: zoom, pan, and explore the AI's understanding

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Framer Motion** (animations)
- **react-force-graph-2d** (graph visualization)
- **Hyperbrowser SDK** ([@hyperbrowser/sdk](https://www.hyperbrowser.ai/docs) for webpage extraction)

## Growth Use Case

HyperVision demonstrates how developers can leverage Hyperbrowser to build intelligent web analysis tools. Perfect for:

- SEO analysis platforms
- Content intelligence dashboards
- Competitive research tools
- Web accessibility auditors
- AI-powered browser extensions

## Project Structure

```
/app
  /page.tsx              # Main application page
  /layout.tsx            # Root layout
  /globals.css           # Global styles
  /api/analyze/route.ts  # API route for analysis
/components
  /UrlInput.tsx          # URL input component
  /MirrorFrame.tsx       # Webpage viewport
  /BrainGraph.tsx        # Force graph visualization
  /ReasoningPanel.tsx    # AI reasoning display
/lib
  /hyperbrowser.ts       # Hyperbrowser API integration
```

## Design Philosophy

- **Minimal**: Black background, white foreground, no clutter
- **Futuristic**: Cyber aesthetic with subtle glows
- **Functional**: Every element serves a purpose
- **Smooth**: Framer Motion powers all transitions

## Font Stack

- **Primary**: Manrope (Semibold, -2% letter spacing)
- **Mono**: DM Mono (All caps, -2% letter spacing)

Both loaded from Google Fonts.

## License

MIT

---

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.
