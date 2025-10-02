# Documentation Buddy

Turn any documentation into an intelligent AI-powered chatbot! Documentation Buddy crawls documentation websites using Hyperbrowser and creates an AI assistant that can answer questions about the content.

![Documentation Buddy](https://img.shields.io/badge/Built%20with-Next.js-000000?style=flat&logo=next.js)
![Hyperbrowser](https://img.shields.io/badge/Powered%20by-Hyperbrowser-blue)
![OpenAI](https://img.shields.io/badge/AI-OpenAI-green)

## Features

- 🕸️ **Smart Web Crawling**: Automatically discovers and crawls documentation pages
- 🤖 **AI-Powered Chat**: Chat with an AI that knows your documentation inside out
- 🎯 **Intelligent Context**: Finds relevant documentation sections for each question
- ⚡ **Fast & Reliable**: Built with Hyperbrowser for robust web scraping
- 🎨 **Beautiful UI**: Clean, modern interface built with Tailwind CSS
- 📱 **Responsive**: Works perfectly on desktop and mobile

## Demo

1. **Enter a documentation URL** (e.g., `https://nextjs.org/docs`)
2. **Wait for crawling** - The app discovers and processes all documentation pages
3. **Start chatting** - Ask questions about the documentation and get AI-powered answers

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- [Hyperbrowser API Key](https://hyperbrowser.ai)
- [OpenAI API Key](https://platform.openai.com/api-keys)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd documentation-buddy
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` and add your API keys:
   ```env
   HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## How It Works

### 1. Web Crawling with Hyperbrowser
- Uses Hyperbrowser's `/crawl` endpoint to discover documentation pages
- Intelligently filters for documentation paths (`/docs`, `/api`, `/guide`, etc.)
- Extracts clean markdown content from each page
- Handles authentication, JavaScript, and complex site structures

### 2. AI-Powered Q&A
- Processes user questions to find relevant documentation sections
- Uses OpenAI GPT-4 to generate contextual answers
- References specific documentation pages in responses
- Maintains conversation context for follow-up questions

### 3. Smart Content Processing
- Chunks large documentation into manageable pieces
- Scores and ranks content relevance for each question
- Limits context size to stay within AI model limits
- Preserves document structure and formatting

## Supported Documentation Sites

Documentation Buddy works with most documentation websites, including:

- ✅ **Next.js** - `https://nextjs.org/docs`
- ✅ **React** - `https://react.dev/learn`
- ✅ **Vercel AI SDK** - `https://sdk.vercel.ai/docs`
- ✅ **Tailwind CSS** - `https://tailwindcss.com/docs`
- ✅ **Most Gitbook, Docusaurus, and custom documentation sites**

## Configuration

### Crawling Options

You can customize the crawling behavior by modifying `src/app/api/crawl/route.ts`:

```typescript
const crawlResult = await client.crawl.startAndWait({
  url: url,
  maxPages: maxPages, 
  includePatterns: [
    "/docs/*",
    "/api/*",
   
  ],
  scrapeOptions: {
    formats: ["markdown"],
    onlyMainContent: true,
    excludeTags: ["nav", "footer", "aside"],
    waitFor: 2000, 
  },
});
```

### AI Model Configuration

Customize the AI behavior in `src/app/api/chat/route.ts`:

```typescript
const result = streamText({
  model: openai('gpt-4o-mini'), 
  temperature: 0.7, 
  maxTokens: 1000, 
});
```

## Project Structure

```
documentation-buddy/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── crawl/          # Hyperbrowser crawling endpoint
│   │   │   └── chat/           # OpenAI chat endpoint
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main page
│   ├── components/
│   │   ├── ChatInterface.tsx   # Chat UI component
│   │   ├── LoadingState.tsx    # Loading animation
│   │   └── UrlInput.tsx        # URL input form
│   ├── contexts/
│   │   └── DocumentationContext.tsx # State management
│   └── lib/
│       ├── types.ts            # TypeScript types
│       └── utils.ts            # Utility functions
├── .env.example                # Environment variables template
└── README.md
```

## API Endpoints

### `POST /api/crawl`
Crawls a documentation website and returns structured content.

**Request:**
```json
{
  "url": "https://nextjs.org/docs",
  "maxPages": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://nextjs.org/docs",
    "pages": [...],
    "totalPages": 42,
    "crawledAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### `POST /api/chat`
AI-powered chat endpoint with documentation context.

**Request:**
```json
{
  "messages": [...],
  "documentationContext": [...]
}
```

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Add environment variables** in Vercel dashboard
4. **Deploy**

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

**"Hyperbrowser API key not configured"**
- Make sure you've added `HYPERBROWSER_API_KEY` to `.env.local`
- Get your API key from [Hyperbrowser Dashboard](https://app.hyperbrowser.ai/dashboard)

**"Failed to crawl documentation"**
- Check if the URL is accessible and contains documentation
- Some sites may require authentication or have anti-bot measures
- Try adjusting the `maxPages` limit

**"OpenAI API key not configured"**
- Add `OPENAI_API_KEY` to `.env.local`
- Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Built With

- [Next.js](https://nextjs.org/) - React framework
- [Hyperbrowser](https://hyperbrowser.ai/) - Web crawling and browser automation
- [OpenAI](https://openai.com/) - AI language model
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI chat interface
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide React](https://lucide.dev/) - Icons

---

**Made with ❤️ and powered by Hyperbrowser & OpenAI**
