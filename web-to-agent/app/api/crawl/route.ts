import { NextRequest, NextResponse } from 'next/server';
import { hyperbrowser, withRetry } from '@/lib/hyperbrowser';
import { CrawlRequestSchema, type ApiResponse, type CrawlResult, type DOMElement } from '@/lib/types';

// Simple HTML parsing function to extract interactive elements
function extractElementsFromHTML(html: string): DOMElement[] {
  const elements: DOMElement[] = [];
  
  // Basic regex patterns for interactive elements
  const patterns = [
    { type: 'button', regex: /<button[^>]*>([^<]*)<\/button>/gi },
    { type: 'input', regex: /<input[^>]*>/gi },
    { type: 'select', regex: /<select[^>]*>[\s\S]*?<\/select>/gi },
    { type: 'textarea', regex: /<textarea[^>]*>[\s\S]*?<\/textarea>/gi },
    { type: 'form', regex: /<form[^>]*>[\s\S]*?<\/form>/gi },
    { type: 'link', regex: /<a[^>]*href[^>]*>([^<]*)<\/a>/gi },
  ];

  patterns.forEach(({ type, regex }) => {
    let match;
    let index = 0;
    while ((match = regex.exec(html)) !== null && index < 20) { // Limit to 20 per type
      const fullMatch = match[0];
      const text = match[1] || '';
      
      // Extract attributes
      const attributes: Record<string, string> = {};
      const attrRegex = /(\w+)=["']([^"']*)["']/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(fullMatch)) !== null) {
        attributes[attrMatch[1]] = attrMatch[2];
      }

      elements.push({
        type: type as 'button' | 'input' | 'select' | 'textarea' | 'form' | 'link' | 'table',
        selector: `${type}:nth-of-type(${index + 1})`,
        text: text.trim().substring(0, 100),
        attributes,
        position: { x: 0, y: 0 }, // Will be updated in real testing
      });
      
      index++;
    }
  });

  return elements.slice(0, 50); // Limit total elements
}

export async function POST(request: NextRequest) {
  try {
    if (!hyperbrowser) {
      return NextResponse.json({
        success: false,
        error: 'HYPERBROWSER_API_KEY is required. Get your key at https://hyperbrowser.ai'
      }, { status: 500 });
    }

    const body = await request.json();
    const { url } = CrawlRequestSchema.parse(body);

    const result = await withRetry(async () => {
      // Use crawl.startAndWait with stealth options
      const crawlResult = await hyperbrowser!.crawl.startAndWait({
        url,
        sessionOptions: { useStealth: true },
      });

      if (!crawlResult.data || crawlResult.data.length === 0) {
        throw new Error('No page data received');
      }
      
      const pageData = crawlResult.data[0];

      const { html, metadata } = pageData;

      // Extract elements from HTML using simple parsing
      const elements = extractElementsFromHTML(html || '');

      // For now, skip screenshots due to API limitations
      const screenshot = { base64: '' };
      const title = Array.isArray(metadata?.title) ? metadata.title[0] : metadata?.title || 'Unknown';

      return {
        url,
        title,
        elements,
        screenshot: screenshot.base64,
        html: html || '',
        timestamp: new Date().toISOString(),
      };
    });

    const response: ApiResponse<CrawlResult> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Crawl error:', error);
    
    const response: ApiResponse<CrawlResult> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to crawl URL',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
