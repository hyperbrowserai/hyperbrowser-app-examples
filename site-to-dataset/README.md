# Site-to-Dataset

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

Transform entire documentation sites into premium LLM datasets in minutes. The most advanced website-to-dataset tool for AI builders.

## 🚀 **What's New**

• **Multi-page crawler** - Process 1-50 pages automatically with smart link discovery  
• **Custom Q/A templates** - 5 specialized modes for different content types  
• **Quality scoring & editing** - Review, edit, and filter Q/A pairs before export  
• **Real-time streaming** - Watch your dataset build live with progress tracking  

## ✨ **Core Features**

### 🕷️ **Multi-Page Crawling**
- **Intelligent site crawling** with configurable depth and page limits
- **Smart filtering** with include/exclude URL patterns
- **Domain restrictions** to stay focused or explore cross-domain links
- **Quick presets** for Documentation, API Reference, Learning Hub, and Simple modes

### 🎨 **Smart Q/A Generation**
- **5 specialized templates**: General, API Docs, Tutorials, Troubleshooting, Concepts
- **Content-aware prompting** optimized for different documentation types
- **GPT-5-nano powered** generation with customizable temperature settings
- **Real-time streaming** with individual Q/A pairs appearing as they're generated

### ⭐ **Quality Control**
- **Automated quality scoring** based on question structure, answer completeness, and actionable content
- **Visual quality indicators** with color-coded High/Medium/Low ratings
- **Inline editing** to refine questions and answers before export
- **Bulk operations** for selecting, filtering, and removing low-quality pairs
- **Search functionality** to find specific Q/A pairs across your dataset

### 📊 **Professional Interface**
- **Toggle modes**: Quick View for overview, Edit & Review for detailed control
- **Live progress tracking** showing crawl status, generation progress, and statistics
- **Clean black-and-white design** focused on functionality over aesthetics
- **Export options** for JSONL, JSON, and filtered datasets

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- **Get an API key**: Visit [hyperbrowser.ai](https://hyperbrowser.ai) to sign up and obtain your API key
- OpenAI API key for Q/A generation

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hyperbrowserai/hyperbrowser-app-examples
cd site-to-dataset
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 How It Works

### Single Page Mode
1. **Enter URL**: Paste any documentation page URL
2. **Choose template**: Select the right Q/A generation style
3. **Process**: Watch real-time scraping and generation
4. **Review & Export**: Download your dataset immediately

### Multi-Page Crawl Mode
1. **Configure crawl**: Set max pages, depth, and URL patterns
2. **Smart discovery**: Automatically finds and processes related pages
3. **Live monitoring**: Track progress across multiple pages
4. **Quality control**: Review, edit, and filter before export

### Template Options

| Template | Best For | Question Style |
|----------|----------|----------------|
| **General** | Blog posts, articles | Balanced how-to and conceptual questions |
| **API Docs** | Technical documentation | Implementation-focused with code examples |
| **Tutorials** | Step-by-step guides | Learning progression and practice-oriented |
| **Troubleshooting** | Support content | Problem-solving and error resolution |
| **Concepts** | Theoretical content | Definitional and explanatory questions |

### Example Output

```jsonl
{"question":"How do I authenticate API requests using bearer tokens?","answer":"Authentication is handled by including your API key in the request headers using the format 'Authorization: Bearer YOUR_API_KEY'. This ensures secure access to all endpoints.","source_url":"https://docs.example.com/auth"}
{"question":"What's the recommended way to handle rate limiting?","answer":"Implement exponential backoff with a maximum retry limit. Start with a 1-second delay and double it for each retry, up to 32 seconds. This prevents overwhelming the API while ensuring requests eventually succeed.","source_url":"https://docs.example.com/rate-limits"}
```

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Animation**: Framer Motion for smooth interactions
- **Web Scraping**: [@hyperbrowser/sdk](https://hyperbrowser.ai) - Official Hyperbrowser SDK
- **AI Processing**: OpenAI GPT-5-nano for Q/A generation
- **Content Processing**: Cheerio for HTML parsing and link extraction

## 📋 API Reference

### `POST /api/generate`

Generate Q/A dataset from a URL with optional multi-page crawling.

**Request Body:**
```json
{
  "url": "https://docs.example.com",
  "templateId": "api-docs",
  "crawlMode": true,
  "crawlOptions": {
    "maxPages": 15,
    "sameDomainOnly": true,
    "includePatterns": ["/api/", "/reference/"],
    "excludePatterns": ["/blog/", "/news/"],
    "depth": 2
  }
}
```

**Response:** Server-sent events stream with real-time updates:
- `{"type": "log", "message": "Processing status"}` 
- `{"type": "progress", "value": 50}`
- `{"type": "qaPair", "pair": {...}}` (individual Q/A pairs)
- `{"type": "result", "qaPairs": [...]}` (final results)

## 🎯 Use Cases

- **LLM Fine-tuning**: Create domain-specific training datasets from entire documentation sites
- **RAG Systems**: Generate comprehensive Q/A pairs for retrieval-augmented generation
- **Chatbot Training**: Convert documentation into conversational training data
- **Knowledge Base Creation**: Transform existing docs into structured, searchable formats
- **Educational Content**: Generate learning materials from technical documentation
- **Research**: Analyze documentation patterns and content quality across sites

## 🔧 Advanced Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `HYPERBROWSER_API_KEY` | Your Hyperbrowser API key | ✅ |
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ |

### Customization Options

- **Templates**: Modify generation prompts in `lib/templates.ts`
- **Quality scoring**: Adjust scoring algorithms in `components/QAEditor.tsx`
- **Crawl patterns**: Update URL filtering logic in `lib/crawler.ts`
- **Chunk processing**: Modify content extraction in `lib/scrape.ts`

### Multi-Page Crawling Tips

- Start with smaller page limits (5-10) to test URL patterns
- Use include patterns to focus on relevant documentation sections
- Exclude patterns help skip non-content pages (blogs, forums, marketing)
- Higher quality datasets come from focused, well-configured crawls
- Monitor the live console to adjust patterns in real-time

## 🛠️ Development

### Enhanced Project Structure

```
site-to-dataset/
├── app/                    # Next.js app directory
│   ├── api/generate/      # Enhanced API route with crawling
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main app with mode switching
├── components/            # React components
│   ├── Navbar.tsx         # Navigation header
│   ├── UrlForm.tsx        # Enhanced form with crawl options
│   ├── TemplateSelector.tsx # Q/A template selection
│   ├── CrawlOptions.tsx   # Multi-page crawl configuration
│   ├── LiveConsole.tsx    # Real-time log display
│   ├── QAEditor.tsx       # Quality control and editing
│   ├── Table.tsx          # Results table
│   └── DownloadBtn.tsx    # Export functionality
├── lib/                   # Core utilities
│   ├── hb.ts             # Hyperbrowser client
│   ├── crawler.ts        # Multi-page crawling logic
│   ├── scrape.ts         # Single page scraping
│   ├── templates.ts      # Q/A generation templates
│   ├── qa.ts             # Q/A generation with templates
│   └── jsonl.ts          # Export utilities
└── public/               # Static assets
```

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

## 🐛 Troubleshooting

### Common Issues

**"No content chunks found"**
- Ensure the URL is accessible and contains meaningful text content
- Check if the site has anti-scraping measures or requires authentication
- Try adjusting include/exclude patterns for multi-page crawls

**"Failed to discover links"**
- Verify the starting URL is accessible
- Check that include patterns match the site's URL structure
- Ensure same-domain restriction is appropriate for your use case

**"Low quality Q/A pairs"**
- Try a different template that better matches your content type
- Use the Edit & Review mode to manually improve pairs
- Adjust include patterns to focus on higher-quality content sections

**"API rate limits"**
- Reduce the number of pages or batch size in crawl configuration
- OpenAI rate limits may require upgrading your API plan
- Monitor the live console for rate limit warnings

### Getting Help

- 📚 [Hyperbrowser Documentation](https://docs.hyperbrowser.ai)
- 💬 [Community Support](https://github.com/hyperbrowserai/)
- 🐛 [Report Issues](https://github.com/hyperbrowserai/hyperbrowser-app-examples/)

## 🤝 Contributing

We welcome contributions! Please see the [Hyperbrowser App Examples](https://github.com/hyperbrowserai/hyperbrowser-app-examples) repository for contribution guidelines.

### Development Guidelines

1. Follow the existing TypeScript and React patterns
2. Maintain the clean black-and-white design aesthetic
3. Add comprehensive error handling for new features
4. Test with various documentation sites and content types
5. Update this README for any new features or configuration options

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Hyperbrowser](https://hyperbrowser.ai)** - For powerful web scraping and crawling capabilities
- **OpenAI** - For advanced language model processing with GPT-5-nano
- **Next.js Team** - For the excellent React framework and developer experience
- **Vercel** - For seamless deployment and hosting platform

---

**Ready to build premium datasets?** Get your API keys at [hyperbrowser.ai](https://hyperbrowser.ai) and start transforming entire documentation sites into training data! 🎉

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.