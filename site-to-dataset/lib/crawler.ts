import { getHB, shutdownHB } from './hb';
import { scrapeAndChunk } from './scrape';
import * as cheerio from 'cheerio';

interface CrawlOptions {
  maxPages: number;
  sameDomainOnly: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  depth: number;
}

interface CrawlResult {
  url: string;
  title?: string;
  chunks: Array<{ text: string; sourceUrl: string }>;
  error?: string;
}

interface CrawlProgress {
  current: number;
  total: number;
  currentUrl: string;
  completedUrls: string[];
  failedUrls: string[];
}

export async function crawlAndScrape(
  startUrl: string, 
  options: CrawlOptions,
  progressCallback?: (progress: CrawlProgress, message: string) => void
): Promise<CrawlResult[]> {
  const hb = getHB();
  const visitedUrls = new Set<string>();
  const urlsToVisit = [startUrl];
  const results: CrawlResult[] = [];
  const failedUrls: string[] = [];

  try {
    const startDomain = new URL(startUrl).hostname;
    
    progressCallback?.({
      current: 0,
      total: Math.min(options.maxPages, urlsToVisit.length),
      currentUrl: startUrl,
      completedUrls: [],
      failedUrls: []
    }, `[CRAWLER] Starting crawl of ${startUrl} (max ${options.maxPages} pages)`);

    // Discover URLs using Hyperbrowser's scrape functionality to extract links
    const discoverUrls = async (url: string, currentDepth: number): Promise<string[]> => {
      if (currentDepth >= options.depth) return [];
      
      try {
        progressCallback?.({
          current: visitedUrls.size,
          total: Math.min(options.maxPages, urlsToVisit.length),
          currentUrl: url,
          completedUrls: Array.from(visitedUrls),
          failedUrls
        }, `[DISCOVERY] Finding links on ${url}`);

        // Use Hyperbrowser's scrape to get HTML and extract links
        const scrapeResult = await hb.scrape.startAndWait({
          url,
          scrapeOptions: { 
            formats: ['html'] 
          }
        });

        const links: string[] = [];
        
        if (scrapeResult?.data?.html) {
          // Use cheerio to parse HTML and extract links
          const $ = cheerio.load(scrapeResult.data.html);
          
          $('a[href]').each((_, element) => {
            try {
              const href = $(element).attr('href');
              if (!href) return;
              
              const fullUrl = new URL(href, url).toString();
              const linkDomain = new URL(fullUrl).hostname;
              
              // Apply filtering rules
              if (options.sameDomainOnly && linkDomain !== startDomain) return;
              
              // Check include patterns
              if (options.includePatterns.length > 0) {
                const includeMatch = options.includePatterns.some(pattern => 
                  fullUrl.includes(pattern) || fullUrl.match(new RegExp(pattern))
                );
                if (!includeMatch) return;
              }
              
              // Check exclude patterns
              if (options.excludePatterns.length > 0) {
                const excludeMatch = options.excludePatterns.some(pattern => 
                  fullUrl.includes(pattern) || fullUrl.match(new RegExp(pattern))
                );
                if (excludeMatch) return;
              }
              
              // Exclude common non-content URLs
              const skipPatterns = [
                /\.(pdf|zip|doc|docx|xls|xlsx|ppt|pptx)$/i,
                /\/(login|logout|signup|register|account|profile)/i,
                /#/,
                /javascript:/i,
                /mailto:/i,
                /tel:/i
              ];
              
              if (skipPatterns.some(pattern => pattern.test(fullUrl))) return;
              
              if (!visitedUrls.has(fullUrl) && !links.includes(fullUrl)) {
                links.push(fullUrl);
              }
            } catch (e) {
              // Skip invalid URLs
            }
          });
        }
        
        return links;
      } catch (error) {
        progressCallback?.({
          current: visitedUrls.size,
          total: Math.min(options.maxPages, urlsToVisit.length),
          currentUrl: url,
          completedUrls: Array.from(visitedUrls),
          failedUrls
        }, `[DISCOVERY] Failed to discover links on ${url}: ${error}`);
        return [];
      }
    };

    // Main crawling loop
    while (urlsToVisit.length > 0 && visitedUrls.size < options.maxPages) {
      const currentUrl = urlsToVisit.shift()!;
      
      if (visitedUrls.has(currentUrl)) continue;
      visitedUrls.add(currentUrl);

      progressCallback?.({
        current: visitedUrls.size,
        total: Math.min(options.maxPages, urlsToVisit.length + visitedUrls.size),
        currentUrl,
        completedUrls: Array.from(visitedUrls).slice(0, -1),
        failedUrls
      }, `[CRAWL] Processing page ${visitedUrls.size}/${options.maxPages}: ${currentUrl}`);

      try {
        // Scrape the current page
        const chunks = await scrapeAndChunk(currentUrl, (message) => {
          progressCallback?.({
            current: visitedUrls.size,
            total: Math.min(options.maxPages, urlsToVisit.length + visitedUrls.size),
            currentUrl,
            completedUrls: Array.from(visitedUrls).slice(0, -1),
            failedUrls
          }, message);
        });

        results.push({
          url: currentUrl,
          chunks,
          title: extractTitleFromUrl(currentUrl)
        });

        progressCallback?.({
          current: visitedUrls.size,
          total: Math.min(options.maxPages, urlsToVisit.length + visitedUrls.size),
          currentUrl,
          completedUrls: Array.from(visitedUrls),
          failedUrls
        }, `[CRAWL] ✅ Successfully scraped ${currentUrl} (${chunks.length} chunks)`);

        // Discover new URLs if we haven't reached max pages
        if (visitedUrls.size < options.maxPages) {
          const newUrls = await discoverUrls(currentUrl, 0);
          
          // Add new URLs to visit queue
          newUrls.forEach(url => {
            if (!visitedUrls.has(url) && !urlsToVisit.includes(url)) {
              urlsToVisit.push(url);
            }
          });

          progressCallback?.({
            current: visitedUrls.size,
            total: Math.min(options.maxPages, urlsToVisit.length + visitedUrls.size),
            currentUrl,
            completedUrls: Array.from(visitedUrls),
            failedUrls
          }, `[DISCOVERY] Found ${newUrls.length} new URLs to explore`);
        }

      } catch (error) {
        failedUrls.push(currentUrl);
        results.push({
          url: currentUrl,
          chunks: [],
          error: error instanceof Error ? error.message : String(error)
        });

        progressCallback?.({
          current: visitedUrls.size,
          total: Math.min(options.maxPages, urlsToVisit.length + visitedUrls.size),
          currentUrl,
          completedUrls: Array.from(visitedUrls),
          failedUrls
        }, `[CRAWL] ❌ Failed to scrape ${currentUrl}: ${error}`);
      }

      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    progressCallback?.({
      current: visitedUrls.size,
      total: visitedUrls.size,
      currentUrl: '',
      completedUrls: Array.from(visitedUrls),
      failedUrls
    }, `[CRAWLER] Completed crawl: ${results.length} pages processed, ${results.reduce((sum, r) => sum + r.chunks.length, 0)} total chunks`);

    return results;

  } catch (error) {
    progressCallback?.({
      current: visitedUrls.size,
      total: visitedUrls.size,
      currentUrl: '',
      completedUrls: Array.from(visitedUrls),
      failedUrls
    }, `[CRAWLER] Crawl failed: ${error}`);
    throw error;
  } finally {
    await shutdownHB();
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1]
        .replace(/[-_]/g, ' ')
        .replace(/\.[^.]*$/, '') // Remove file extension
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return urlObj.hostname;
  } catch {
    return 'Unknown Page';
  }
}

export type { CrawlOptions, CrawlResult, CrawlProgress };
