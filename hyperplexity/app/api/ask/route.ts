import { NextRequest, NextResponse } from 'next/server';
import { Hyperbrowser } from '@hyperbrowser/sdk';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const hyperbrowser = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});

interface EnhancedSource {
  url: string;
  title: string;
  content: string;
  imageUrl?: string;
  favicon?: string;
  domain: string;
  charCount: number;
  relevanceScore: number;
  freshness: number;
  credibilityScore: number;
}

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  publishedDate?: string;
  relevanceScore?: number;
}

interface HyperbrowserExtractResult {
  title?: string;
  mainContent?: string;
  keyFindings?: string[];
  statistics?: string[];
  dateReferences?: string[];
  imageUrl?: string;
  ogImage?: string;
  articleImages?: string[];
  authorInfo?: string;
  publishDate?: string;
  lastUpdated?: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isControllerClosed = false;

      const safeEnqueue = (data: string) => {
        if (!isControllerClosed) {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('Controller enqueue error:', error);
            isControllerClosed = true;
          }
        }
      };

      const safeClose = () => {
        if (!isControllerClosed) {
          isControllerClosed = true;
          controller.close();
        }
      };

      try {
        const { query } = await request.json();

        if (!query) {
          safeEnqueue('data: {"type": "error", "error": "Query is required"}\n\n');
          safeClose();
          return;
        }

        // Add today's date context for fresh results
        const today = new Date().toISOString().split('T')[0];
        const contextualQuery = `${query} (search for latest information as of ${today})`;

        // Send initial status
        safeEnqueue('data: {"type": "status", "message": "Searching with Hyperbrowser AI..."}\n\n');

        // Get search results from available providers
        const searchResults = await getSearchResults(query);
        
        if (searchResults.length === 0) {
          safeEnqueue('data: {"type": "error", "error": "No search results found"}\n\n');
          safeClose();
          return;
        }

        safeEnqueue('data: {"type": "status", "message": "Extracting and analyzing content with Hyperbrowser..."}\n\n');

        // Rank and process top sources
        const rankedResults = rankSearchResults(searchResults, query);
        const topSources = rankedResults.slice(0, 8);

        // Process sources with improved parallel extraction
        const sources: EnhancedSource[] = [];
        let completedExtractions = 0;

        const scrapePromises = topSources.map(async (searchResult, index) => {
          try {
            const source = await extractEnhancedContentWithHyperbrowser(
              searchResult.url, 
              searchResult.title, 
              contextualQuery,
              searchResult.publishedDate
            );
            if (source && !isControllerClosed) {
              sources.push(source);
              // Send source as soon as it's ready with enhanced data
              safeEnqueue(`data: {"type": "source", "source": ${JSON.stringify({
                ...source,
                index: sources.length - 1,
                processingTime: Date.now()
              })}}\n\n`);
            }
          } catch (error) {
            console.error(`Failed to extract from ${searchResult.url}:`, error);
          } finally {
            completedExtractions++;
            if (completedExtractions <= topSources.length) {
              safeEnqueue(`data: {"type": "status", "message": "Processing source ${completedExtractions}/${topSources.length}..."}\n\n`);
            }
          }
        });

        // Wait for all scraping to complete
        await Promise.allSettled(scrapePromises);

        // Sort sources by relevance and freshness
        sources.sort((a, b) => {
          const scoreA = (a.relevanceScore * 0.6) + (a.freshness * 0.3) + (a.credibilityScore * 0.1);
          const scoreB = (b.relevanceScore * 0.6) + (b.freshness * 0.3) + (b.credibilityScore * 0.1);
          return scoreB - scoreA;
        });

        // Generate answer if we have sources
        if (sources.length > 0 && !isControllerClosed) {
          safeEnqueue('data: {"type": "status", "message": "Generating comprehensive answer..."}\n\n');
          await streamAnswerWithContext(query, sources, today, safeEnqueue, safeClose);
        } else if (!isControllerClosed) {
          safeEnqueue('data: {"type": "error", "error": "Failed to extract content from sources"}\n\n');
          safeClose();
        }

      } catch (error) {
        console.error('Error processing request:', error);
        safeEnqueue('data: {"type": "error", "error": "Failed to process request"}\n\n');
        safeClose();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}



async function getSearchResults(query: string): Promise<SearchResult[]> {
  // Fallback to Serper Google Search
  try {
    const results = await searchWithSerper(query);
    if (results.length > 0) {
      console.log('Search successful with Serper');
      return results;
    }
  } catch (error) {
    console.error('Serper search failed:', error);
  }

  return [];
}

// Enhanced source ranking algorithm
function rankSearchResults(results: SearchResult[], query: string): SearchResult[] {
  const queryTerms = query.toLowerCase().split(' ');
  
  return results.map(result => {
    let score = result.relevanceScore || 0.5;
    
    // Boost score based on title relevance
    const titleLower = result.title.toLowerCase();
    const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length;
    score += (titleMatches / queryTerms.length) * 0.3;
    
    // Boost recent content
    if (result.publishedDate) {
      const publishDate = new Date(result.publishedDate);
      const daysSincePublish = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublish < 7) score += 0.2;
      else if (daysSincePublish < 30) score += 0.1;
    }
    
    // Boost credible domains
    const domain = new URL(result.url).hostname.toLowerCase();
    const credibleDomains = ['reuters.com', 'bloomberg.com', 'techcrunch.com', 'github.com', 'stackoverflow.com', 'nature.com', 'arxiv.org'];
    if (credibleDomains.some(d => domain.includes(d))) {
      score += 0.15;
    }
    
    return { ...result, relevanceScore: Math.min(score, 1.0) };
  }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}


// Serper Google Search API - Fast Google results
async function searchWithSerper(query: string): Promise<SearchResult[]> {
  if (!process.env.SERPER_API_KEY) {
    throw new Error('Serper API key not configured');
  }

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: query,
      num: 10,
      tbs: 'qdr:m' // Recent results within last month
    })
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`);
  }

  const data = await response.json();
  return data.organic?.map((result: any) => ({
    url: result.link,
    title: result.title,
    snippet: result.snippet,
    publishedDate: result.date,
    relevanceScore: 0.6
  })) || [];
}

// Enhanced content extraction with Hyperbrowser
async function extractEnhancedContentWithHyperbrowser(
  url: string, 
  fallbackTitle: string, 
  query: string,
  publishedDate?: string
): Promise<EnhancedSource | null> {
  try {
    const result = await hyperbrowser.extract.startAndWait({
      urls: [url],
      prompt: `Extract comprehensive content relevant to "${query}". Focus on:
        1. Main article content and key information
        2. Recent data, statistics, and updates
        3. Expert opinions and analysis
        4. Any date-specific information
        5. High-quality images (og:image, article images)
        
        Prioritize the most recent and relevant information.`,
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          mainContent: { type: 'string' },
          keyFindings: { 
            type: 'array',
            items: { type: 'string' }
          },
          statistics: {
            type: 'array', 
            items: { type: 'string' }
          },
          dateReferences: {
            type: 'array',
            items: { type: 'string' }
          },
          imageUrl: { type: 'string' },
          ogImage: { type: 'string' },
          articleImages: {
            type: 'array',
            items: { type: 'string' }
          },
          authorInfo: { type: 'string' },
          publishDate: { type: 'string' },
          lastUpdated: { type: 'string' }
        },
        required: ['title', 'mainContent']
      }
    });

    const domain = new URL(url).hostname;
    const extractedData = result.data as HyperbrowserExtractResult;
    const title = extractedData?.title || fallbackTitle || 'Untitled';
    
    // Compile comprehensive content
    const content = [
      extractedData?.mainContent || '',
      extractedData?.keyFindings?.length ? `\n\nKey Findings:\n${extractedData.keyFindings.join('\n')}` : '',
      extractedData?.statistics?.length ? `\n\nStatistics:\n${extractedData.statistics.join('\n')}` : '',
      extractedData?.dateReferences?.length ? `\n\nDate References:\n${extractedData.dateReferences.join('\n')}` : '',
      extractedData?.authorInfo ? `\n\nAuthor: ${extractedData.authorInfo}` : '',
      extractedData?.publishDate ? `\n\nPublished: ${extractedData.publishDate}` : '',
      extractedData?.lastUpdated ? `\n\nLast Updated: ${extractedData.lastUpdated}` : ''
    ].filter(Boolean).join('');
    
    // Choose best image
    const imageUrl = extractedData?.ogImage || 
                    (extractedData?.articleImages && extractedData.articleImages[0]) || 
                    extractedData?.imageUrl;
    
    // Calculate scores
    const relevanceScore = calculateRelevanceScore(content, query);
    const freshness = calculateFreshnessScore(publishedDate || extractedData?.publishDate);
    const credibilityScore = calculateCredibilityScore(domain, extractedData?.authorInfo);
    
    return {
      url,
      title,
      content: content.slice(0, 4000), // Increased content limit
      imageUrl,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      domain,
      charCount: content.length,
      relevanceScore,
      freshness,
      credibilityScore
    };
  } catch (error) {
    console.error(`Failed to extract enhanced content from ${url}:`, error);
    return null;
  }
}

// Scoring algorithms
function calculateRelevanceScore(content: string, query: string): number {
  const queryTerms = query.toLowerCase().split(' ');
  const contentLower = content.toLowerCase();
  const matches = queryTerms.filter(term => contentLower.includes(term)).length;
  return Math.min(matches / queryTerms.length, 1.0);
}

function calculateFreshnessScore(publishedDate?: string): number {
  if (!publishedDate) return 0.5;
  
  try {
    const pubDate = new Date(publishedDate);
    const daysSincePublish = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSincePublish < 1) return 1.0;
    if (daysSincePublish < 7) return 0.9;
    if (daysSincePublish < 30) return 0.7;
    if (daysSincePublish < 90) return 0.5;
    return 0.3;
  } catch {
    return 0.5;
  }
}

function calculateCredibilityScore(domain: string, authorInfo?: string): number {
  let score = 0.5;
  
  // High credibility domains
  const highCredDomains = ['reuters.com', 'bloomberg.com', 'nature.com', 'science.org', 'github.com'];
  const medCredDomains = ['techcrunch.com', 'arstechnica.com', 'wired.com', 'stackoverflow.com'];
  
  if (highCredDomains.some(d => domain.includes(d))) score = 0.9;
  else if (medCredDomains.some(d => domain.includes(d))) score = 0.7;
  
  // Boost if author information is available
  if (authorInfo && authorInfo.length > 10) score += 0.1;
  
  return Math.min(score, 1.0);
}

async function streamAnswerWithContext(
  query: string,
  sources: EnhancedSource[],
  today: string,
  safeEnqueue: (data: string) => void,
  safeClose: () => void
) {
  // Compile enhanced context with better source information
  const contextData = sources.map((source, index) => {
    const content = source.content.slice(0, 2500); // Increased context per source
    return `[${index + 1}] Source: ${source.title} (${source.domain})
Relevance: ${(source.relevanceScore * 100).toFixed(0)}% | Freshness: ${(source.freshness * 100).toFixed(0)}% | Credibility: ${(source.credibilityScore * 100).toFixed(0)}%
Content: ${content}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are Hyperplexity, an advanced AI search assistant powered by Hyperbrowser. Today's date is ${today}.

CRITICAL INSTRUCTIONS:
- Use numbered citations [1], [2], [3] that correspond exactly to the provided sources
- Prioritize the most recent and credible information
- When discussing current events, explicitly mention the date context
- Provide comprehensive, well-structured answers with clear sections
- Include relevant statistics, data points, and expert opinions
- If sources have conflicting information, present both perspectives with dates
- Use bullet points and numbered lists for clarity
- Focus on actionable insights and key takeaways
- Emphasize information that's specifically relevant to ${today}`;

  const userPrompt = `Query: ${query}

Current Date: ${today}

Sources (ranked by relevance, freshness, and credibility):
${contextData}

Provide a comprehensive, up-to-date answer with proper citations [1], [2], etc. Focus on the most recent information and clearly indicate when discussing current developments.`;

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500, // Increased for more comprehensive answers
      temperature: 0.2, // Lower temperature for more factual responses
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        safeEnqueue(`data: {"type": "answer_chunk", "chunk": ${JSON.stringify(content)}}\n\n`);
      }
    }

    // Generate intelligent follow-up questions
    const followUpPrompt = `Based on the query "${query}" and today's date (${today}), suggest 4-6 intelligent follow-up questions that users would likely want to explore next. 

Focus on:
- Recent developments and trends
- Deeper analysis of key points
- Related current events
- Practical applications
- Future implications

Return only the questions, one per line.`;
    
    const followUpResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: followUpPrompt }],
      max_tokens: 300,
      temperature: 0.6
    });

    const followUpQuestions = followUpResponse.choices[0]?.message?.content
      ?.split('\n')
      .filter(q => q.trim() && !q.includes('?') === false) // Ensure they're questions
      .slice(0, 6) || [];

    safeEnqueue(`data: {"type": "follow_up_questions", "questions": ${JSON.stringify(followUpQuestions)}}\n\n`);
    safeEnqueue('data: {"type": "complete"}\n\n');
    safeClose();

  } catch (error) {
    console.error('OpenAI streaming error:', error);
    safeEnqueue('data: {"type": "error", "error": "Failed to generate answer"}\n\n');
    safeClose();
  }
} 