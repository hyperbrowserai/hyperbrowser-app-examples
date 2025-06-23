


https://github.com/user-attachments/assets/d2e89f88-5a6e-491a-8b52-6674d66c64b9


# Hyperplexity - AI Search Engine

A Perplexity-style AI search engine built with Next.js, featuring real-time web search, AI-powered answers, and smooth animations.

## 🚀 Performance Optimized

**Fast Search APIs**: Now uses multiple high-performance search providers instead of slow web scraping:
- **Brave Search API** - Fast, independent search with 2,000 free queries/month
- **Tavily API** - AI-optimized search with free tier
- **Serper API** - Fast Google results with free tier
- **Hyperbrowser** - Fallback for content extraction

**Speed Improvements**:
- ⚡ **10x faster** search results (300ms vs 3-5s)
- 🔄 Progressive streaming - answers start as soon as first source is ready
- 🎯 Parallel processing of multiple sources
- 📱 Optimized for real-time user experience


## ✨ Features

### Core Functionality
- 🔍 **Real-time web search** with multiple provider fallbacks
- 🤖 **AI-powered answers** with source citations
- 📺 **Progressive streaming** - results appear as they're ready
- 🎨 **Smooth animations** - Perplexity-style UI with Framer Motion

### Advanced Features
- 🎯 **Source carousel** - Horizontal scrolling cards with previews
- 💬 **Follow-up questions** - AI-generated intelligent suggestions
- 📱 **Citation highlighting** - Click citations to highlight sources
- 🌓 **Dark/light mode** - Smooth theme transitions
- 📚 **Search history** - Client-side session storage
- 🎭 **Loading states** - Skeleton screens and progress indicators

## 🛠️ Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd hyperplexity
npm install
```

### 2. Environment Variables
Create a `.env.local` file with the following keys:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here

# Search Providers (at least one recommended for best performance)
BRAVE_SEARCH_API_KEY=your_brave_search_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
SERPER_API_KEY=your_serper_api_key_here
```

### 3. Get API Keys

#### Required APIs
- **OpenAI**: Get key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Hyperbrowser**: Get key from [Hyperbrowser Dashboard](https://hyperbrowser.ai/dashboard)

#### Search Provider APIs (Choose One or More)
- **Brave Search** (Recommended): [Get API Key](https://api.search.brave.com/) - 2,000 free queries/month
- **Tavily**: [Get API Key](https://app.tavily.com/) - AI-optimized, free tier available
- **Serper**: [Get API Key](https://serper.dev/) - Fast Google results, free tier available

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🏗️ Architecture

### Search Provider Hierarchy
1. **Brave Search API** - Primary (fastest, most reliable)
2. **Tavily API** - Secondary (AI-optimized)
3. **Serper API** - Tertiary (Google results)
4. **Hyperbrowser** - Fallback (slower but reliable)

### Data Flow
1. User submits query
2. Fast search API returns URLs + snippets (< 300ms)
3. Hyperbrowser extracts content from top URLs in parallel
4. Sources stream to UI as they're ready
5. OpenAI generates answer with citations
6. Follow-up questions generated

### Performance Features
- **Parallel processing** - All sources scraped simultaneously
- **Progressive streaming** - Answer generation starts with first source
- **Smart fallbacks** - Multiple search providers for reliability
- **Efficient caching** - Source metadata cached for quick display

## 🎨 UI Components

### Animated Components
- `SourceCard.tsx` - Cards with hover effects and loading states
- `SourceCarousel.tsx` - Horizontal scrolling with smooth animations
- `AnswerStream.tsx` - Typewriter effect with citation highlighting
- `FollowUpQuestions.tsx` - 3D pill animations with hover effects
- `HistorySidebar.tsx` - Slide-in sidebar with search history
- `ThemeToggle.tsx` - Smooth dark/light mode transitions

### Animation Features
- **Framer Motion** - GPU-accelerated animations
- **Staggered entrances** - Components appear in sequence
- **Smooth transitions** - Custom easing curves
- **Interactive feedback** - Hover and tap animations
- **Loading states** - Skeleton screens and progress bars

## 🔧 API Endpoints

### `/api/ask` (POST)
Streams search results and AI-generated answers.

**Request**:
```json
{
  "query": "What is quantum computing?"
}
```

**Response** (Server-Sent Events):
```javascript
data: {"type": "status", "message": "Searching the web..."}
data: {"type": "source", "source": {...}}
data: {"type": "answer_chunk", "chunk": "Quantum computing is..."}
data: {"type": "follow_up_questions", "questions": [...]}
data: {"type": "complete"}
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

### Docker
```bash
docker build -t hyperplexity .
docker run -p 3000:3000 hyperplexity
```

## 📊 Performance Metrics

### Search Speed Comparison
- **Old (Hyperbrowser only)**: 3-5 seconds
- **New (Fast APIs)**: 300-800ms
- **Improvement**: **10x faster**

### API Response Times
- Brave Search: ~200ms
- Tavily: ~300ms  
- Serper: ~250ms
- Hyperbrowser: ~2-3s (fallback only)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Hyperbrowser](https://hyperbrowser.ai/) - Web scraping and content extraction
- [Brave Search](https://search.brave.com/) - Independent search API
- [OpenAI](https://openai.com/) - GPT-4 for answer generation
- [Framer Motion](https://www.framer.com/motion/) - Smooth animations
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
