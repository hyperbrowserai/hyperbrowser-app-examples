import { NextRequest, NextResponse } from 'next/server';
import { Hyperbrowser } from '@hyperbrowser/sdk';
import { OpenAI } from 'openai';
import { FetchResearchRequestSchema, FetchResearchResponseSchema, ResearchArticleSchema } from '@/lib/types';
import { generateRunId, retryWithBackoff, readCacheJson, writeCacheJson } from '@/lib/utils';

const hyperbrowser = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fastest, most reliable sources only
const MEDICAL_SOURCES = [
  'https://www.mayoclinic.org',
  'https://medlineplus.gov',
];

const RESEARCH_SUMMARY_PROMPT = `
Summarize this medical article content focusing on:
1. Normal reference ranges for the blood test
2. Clinical significance of abnormal values
3. Associated conditions or diseases
4. Key medical insights

Keep the summary concise (2-3 sentences) and medically accurate.

Content:
`;

function buildSourceSearchUrl(source: string, query: string): string {
  const q = encodeURIComponent(query);
  const host = new URL(source).hostname;
  if (host.includes('mayoclinic.org')) return `${source}/search/search-results?q=${q}`;
  if (host === 'www.nih.gov' || host.endsWith('.nih.gov')) return `https://search.nih.gov/search?affiliate=nih&query=${q}`;
  if (host === 'pubmed.ncbi.nlm.nih.gov') return `${source}/?term=${q}`;
  if (host === 'www.webmd.com') return `${source}/search/search_results/default.aspx?query=${q}`;
  if (host === 'medlineplus.gov') return `${source}/search/?query=${q}`;
  return `${source}`;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

export async function POST(request: NextRequest) {
  let session: {id: string} | null = null;
  try {
    const body = await request.json();
    const validatedRequest = FetchResearchRequestSchema.parse(body);
    
    const runId = generateRunId();
    const articles: Array<{title: string; summary: string; link: string; source: string}> = [];

    // Create a Hyperbrowser session with proxy
    session = await (hyperbrowser as Record<string, any>).sessions.create({
      useProxy: true,
      proxyCountry: 'US',
    });

    if (!session?.id) {
      throw new Error('Failed to create Hyperbrowser session');
    }

    // Build search URLs for batch scraping
    const searchQuery = `${validatedRequest.testName} blood test normal range reference values`;
    const searchUrls = MEDICAL_SOURCES.map((source) => buildSourceSearchUrl(source, searchQuery));

    // Attempt batch scrape for search pages
    const articleUrlsByHost = new Map<string, string[]>();
    try {
      const searchBatch = await retryWithBackoff(async () => {
        return (hyperbrowser as any).scrape.batch.startAndWait({
          urls: searchUrls,
          sessionId: session!.id,
          scrapeOptions: {
            formats: ['links'],
            onlyMainContent: false,
            timeout: 5000,
          },
        } as any);
      });

      const extractBatchItems = (batch: any): any[] => {
        if (!batch) return [];
        if (Array.isArray(batch)) return batch;
        if (Array.isArray(batch?.data)) return batch.data;
        if (Array.isArray(batch?.results)) return batch.results;
        if (Array.isArray(batch?.items)) return batch.items;
        // Some SDKs return map keyed by URL
        if (batch?.data && typeof batch.data === 'object') {
          const values = Object.values(batch.data);
          if (values.every((v) => typeof v === 'object')) return values as any[];
        }
        return [];
      };

      const searchItems = extractBatchItems(searchBatch);
      for (const item of searchItems) {
        const pageUrl: string = item?.url || item?.requestUrl || '';
        const originHost = pageUrl ? new URL(pageUrl).hostname : '';
        const linksArr: any[] = (item?.data?.links as any[]) || (item?.links as any[]) || [];
        const links: string[] = [];
        for (const li of linksArr) {
          const href = typeof li === 'string' ? li : li?.url || li?.href;
          if (href && getDomain(href).includes(originHost)) links.push(href);
        }

        const uniqueTop = Array.from(new Set(links)).slice(0, 2);
        if (!articleUrlsByHost.has(originHost)) articleUrlsByHost.set(originHost, []);
        articleUrlsByHost.set(originHost, [
          ...articleUrlsByHost.get(originHost)!,
          ...uniqueTop,
        ]);
      }
    } catch (batchErr) {
      console.warn('Batch search failed, falling back to per-source scraping:', batchErr);
    }

    // Fallback to per-source search if batch produced nothing
    if ([...articleUrlsByHost.values()].flat().length === 0) {
      for (const source of MEDICAL_SOURCES) {
        try {
          const searchUrl = buildSourceSearchUrl(source, searchQuery);
          const searchPage = await retryWithBackoff(async () => {
            return hyperbrowser.scrape.startAndWait({
              url: searchUrl,
              sessionId: session!.id,
              scrapeOptions: {
                formats: ['markdown', 'html', 'links'],
                onlyMainContent: false,
                timeout: 15000,
              },
            } as any);
          });

          const originHost = new URL(source).hostname;
          const foundLinks: string[] = [];
          const linkItems: any[] = (searchPage?.data?.links as any[]) || [];
          for (const li of linkItems) {
            const href = typeof li === 'string' ? li : li?.url || li?.href;
            if (href && getDomain(href).includes(originHost)) foundLinks.push(href);
          }

          const uniqueTop = Array.from(new Set(foundLinks)).slice(0, 2);
          articleUrlsByHost.set(originHost, uniqueTop);
        } catch (error) {
          console.error(`Error searching ${source}:`, error);
          continue;
        }
      }
    }

    // Prepare article URLs (cap per host and total)
    const perHostLimited: string[] = [];
    for (const [, urls] of articleUrlsByHost.entries()) {
      perHostLimited.push(...urls.slice(0, 2));
    }
    const articleUrls = Array.from(new Set(perHostLimited)).slice(0, 4);

    // Batch scrape article pages for markdown
    let articleItems: any[] = [];
    if (articleUrls.length > 0) {
      try {
        const articleBatch = await retryWithBackoff(async () => {
          return (hyperbrowser as any).scrape.batch.startAndWait({
            urls: articleUrls,
            sessionId: session!.id,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true,
              timeout: 8000,
            },
          } as any);
        });

        const extractBatchItems = (batch: any): any[] => {
          if (!batch) return [];
          if (Array.isArray(batch)) return batch;
          if (Array.isArray(batch?.data)) return batch.data;
          if (Array.isArray(batch?.results)) return batch.results;
          if (Array.isArray(batch?.items)) return batch.items;
          if (batch?.data && typeof batch.data === 'object') {
            const values = Object.values(batch.data);
            if (values.every((v) => typeof v === 'object')) return values as any[];
          }
          return [];
        };

        articleItems = extractBatchItems(articleBatch);
      } catch (batchErr) {
        console.warn('Batch article scraping failed, falling back to per-URL scraping:', batchErr);
        // Fallback per-URL scrape
        for (const url of articleUrls) {
          try {
            const page = await retryWithBackoff(async () => {
              return hyperbrowser.scrape.startAndWait({
                url,
                sessionId: session!.id,
                scrapeOptions: {
                  formats: ['markdown'],
                  onlyMainContent: true,
                  timeout: 20000,
                },
              } as any);
            });
            articleItems.push({ url, data: { markdown: page?.data?.markdown || '' } });
          } catch (error) {
            console.error(`Error scraping ${url}:`, error);
            continue;
          }
        }
      }
    }

    // Summarize articles (take up to 6 with sufficient content)
    const candidates = articleItems
      .map((it) => {
        const url: string = it?.url || it?.requestUrl || '';
        const md: string = it?.data?.markdown || '';
        return { url, md };
      })
      .filter((x) => x.url && x.md && x.md.length > 200)
      .slice(0, 2);

    // Cache by test name (24h TTL)
    const cacheKey = `research:${validatedRequest.testName.toLowerCase()}`;
    let summaries: (any | null)[] | null = await readCacheJson<any[]>('research', cacheKey, 24 * 60 * 60 * 1000);

    if (!summaries) {
      summaries = await Promise.all(
        candidates.map(async ({ url, md }) => {
          const originHost = getDomain(url);
          try {
            const summary = await retryWithBackoff(async () => {
              const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                  { role: 'user', content: RESEARCH_SUMMARY_PROMPT + md.substring(0, 2500) },
                ],
                temperature: 0.1,
                max_tokens: 150,
              });
              return completion.choices[0]?.message?.content || '';
            });

            if (summary) {
              return {
                title: md.split('\n')[0]?.replace(/^#\s*/, '') || originHost,
                summary,
                link: url,
                source: originHost,
              };
            }
          } catch (error) {
            console.error(`Error summarizing ${url}:`, error);
          }
          return null;
        })
      );

      const toCache = (summaries.filter(Boolean).slice(0, 4) as any[]);
      await writeCacheJson('research', cacheKey, toCache);
    }

    for (const a of summaries) {
      if (a) articles.push(a);
    }
    
    // Validate articles
    const validatedArticles = articles
      .filter(article => article.title && article.summary && article.link)
      .map(article => ResearchArticleSchema.parse(article))
      .slice(0, 4); // Limit to 4 articles
    
    const response = FetchResearchResponseSchema.parse({
      articles: validatedArticles,
      runId,
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in fetchResearch:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    // Critical: Clean up Hyperbrowser session
    if (session?.id) {
      try {
        await (hyperbrowser as Record<string, any>).sessions.stop(session.id);
      } catch (cleanupError) {
        console.error('Session cleanup failed:', cleanupError);
      }
    }
  }
}

