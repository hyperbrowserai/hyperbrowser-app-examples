**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# HyperPages

A production-ready AI-powered research page builder. Create beautiful, long-form content pages with automatic research (Hyperbrowser), AI content generation (GPT-5-nano), and image integration (Unsplash + Google Gemini).

## Features

- **AI-Powered Content Generation**: GPT-5-nano generates comprehensive, well-structured content
- **Smart Web Research**: Hyperbrowser scrapes and analyzes topics for accurate content
- **Unsplash Integration**: Beautiful stock photos from Unsplash
- **Real-Time Streaming**: Watch content generate word-by-word with smooth animations
- **Local Storage**: All pages saved to browser localStorage (perfect for open-source)
- **Beautiful Typography**: Premium Manrope + Playfair Display fonts with -2% letter spacing
- **Smart TOC**: Auto-generated table of contents with smooth scrolling
- **Responsive Design**: Looks great on all devices

## Get Started

### Prerequisites

- Node.js 18+ installed
- Get an API key from [Hyperbrowser](https://hyperbrowser.ai)
- OpenAI API key for GPT-5-nano
- Unsplash API key for stock photos

### Installation

```bash
npm install
```

### Environment Setup

1. Copy `.env.local.example` to `.env.local`
2. Fill in your API keys:

```env
HYPERBROWSER_API_KEY=your_key
OPENAI_API_KEY=your_key
UNSPLASH_ACCESS_KEY=your_unsplash_key
```

### Storage

Pages are automatically saved to browser localStorage. No database setup required! Perfect for open-source projects.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start creating pages.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Consistent icons
- **localStorage** - Browser storage (no database needed)
- **OpenAI GPT-5-nano** - Fast, cost-effective content generation
- **Hyperbrowser SDK** - Web research and scraping
- **Unsplash** - Stock photo library

## Project Structure

```
/app
  /page.tsx              # Homepage with topic input
  /editor/page.tsx       # Main editor interface
  /p/[slug]/page.tsx     # Published page view
  /api
    /generate/route.ts   # Content generation endpoint
    /pages/route.ts      # CRUD for pages
    /pages/[slug]/route.ts
    /images
      /unsplash/route.ts # Unsplash search
/components
  /sidebar.tsx           # Navigation with saved pages
  /navbar.tsx            # Top nav with Launch Hyperbrowser button
  /logo.tsx              # HyperPages logo
  /button.tsx            # Reusable button component
  /share-modal.tsx       # Share & export modal
  /streaming-text.tsx    # Text streaming animation
/lib
  /storage.ts            # localStorage utilities
  /openai.ts             # OpenAI GPT-5-nano client
  /hyperbrowser.ts       # Hyperbrowser SDK
  /unsplash.ts           # Unsplash API helper
```

## Usage

### Creating a Page

1. Enter a topic on the homepage
2. Select your target audience
3. Watch as AI researches and generates content
4. Add images to sections (Unsplash or AI-generated)
5. Edit and refine the content
6. Page auto-saves to localStorage

### Accessing Pages

- View all your pages in the sidebar under "Your Pages"
- Click any page to view the published version
- Pages are stored in your browser's localStorage
- Share pages with the unique URL: `pages.hyperbrowser.ai/p/[slug]`

### Image Integration

Add beautiful stock photos from Unsplash to your sections with smart search.

## Growth Use Case

HyperPages demonstrates the power of [Hyperbrowser](https://hyperbrowser.ai) for:

- Automated content research and curation
- Fast, AI-powered page generation
- Beautiful, shareable content pages
- Perfect for content marketers, researchers, educators, and creators

## API Architecture

```
User Input → /api/generate
  ↓
Hyperbrowser (research) + GPT-5-nano (content)
  ↓
Stream to Editor → Save to localStorage
  ↓
Published at /p/[slug]
```

## Follow for Updates

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.

---

Built with ❤️ using [Hyperbrowser](https://hyperbrowser.ai)
