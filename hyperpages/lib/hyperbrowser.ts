import { Hyperbrowser } from '@hyperbrowser/sdk';

export const hyperbrowser = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});

export type Source = {
  title: string;
  url: string;
  snippet: string;
};

export const fetchSources = async (topic: string): Promise<Source[]> => {
  try {
    console.log(`Scraping real sources for: ${topic}`);
    
    const sources: Source[] = [];
    
    // Prepare URLs to scrape
    const topicForWiki = topic.replace(/\s+/g, '_');
    const urlsToScrape = [
      {
        url: `https://en.wikipedia.org/wiki/${topicForWiki}`,
        name: 'Wikipedia',
      },
      {
        url: `https://www.britannica.com/search?query=${encodeURIComponent(topic)}`,
        name: 'Britannica',
      },
      {
        url: `https://simple.wikipedia.org/wiki/${topicForWiki}`,
        name: 'Simple Wikipedia',
      },
    ];
    
    // Scrape each source with Hyperbrowser
    const scrapePromises = urlsToScrape.map(async ({ url, name }) => {
      try {
        console.log(`Scraping ${name}...`);
        const result = await hyperbrowser.scrape.startAndWait({
          url,
        });
        
        const markdown = result.data?.markdown || '';
        
        // Extract a meaningful snippet from the content
        let snippet = '';
        if (markdown) {
          // Get first paragraph that's not too short
          const paragraphs = markdown.split('\n\n').filter(p => p.length > 50);
          snippet = paragraphs[0]?.slice(0, 200) || '';
        }
        
        // Clean up the snippet
        snippet = snippet
          .replace(/\[edit\]/g, '')
          .replace(/\[\d+\]/g, '')
          .trim();
        
        console.log(`✓ Scraped ${name}: ${snippet.length} chars`);
        
        if (snippet.length > 30) {
          return {
            title: name,
            url,
            snippet: snippet + '...',
          };
        }
        
        return null;
      } catch (error) {
        console.log(`✗ Failed to scrape ${name}:`, error);
        return null;
      }
    });
    
    // Wait for all scrapes to complete
    const results = await Promise.all(scrapePromises);
    
    // Filter out failed scrapes and add to sources
    for (const result of results) {
      if (result && sources.length < 3) {
        sources.push(result);
      }
    }
    
    console.log(`Successfully scraped ${sources.length} sources`);
    
    // If we got at least one source, return them
    if (sources.length > 0) {
      return sources;
    }
    
    // Fallback if all scrapes failed
    console.log('All scrapes failed - returning fallback sources');
    return generateFallbackSources(topic);
    
  } catch (error) {
    console.error('Hyperbrowser source fetching error:', error);
    return generateFallbackSources(topic);
  }
};

// Generate fallback sources when scraping fails
function generateFallbackSources(topic: string): Source[] {
  const topicSlug = topic.toLowerCase().replace(/\s+/g, '-');
  
  return [
    {
      title: 'Wikipedia',
      url: `https://en.wikipedia.org/wiki/${topicSlug}`,
      snippet: `Encyclopedia article about ${topic}`,
    },
    {
      title: 'Research Papers',
      url: `https://scholar.google.com/scholar?q=${encodeURIComponent(topic)}`,
      snippet: `Academic research on ${topic}`,
    },
    {
      title: 'Latest News',
      url: `https://news.google.com/search?q=${encodeURIComponent(topic)}`,
      snippet: `Recent news about ${topic}`,
    },
  ];
}

