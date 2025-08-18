import { Hyperbrowser } from '@hyperbrowser/sdk';
import { NextResponse } from 'next/server';

const hyperbrowser = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY });

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'Invalid URLs provided' }, { status: 400 });
    }

    // Scrape content from all provided URLs using Hyperbrowser's official methods
    const scrapeResults = await Promise.all(
      urls.map(async (url: string) => {
        try {
          // Use the official startAndWait helper per docs
          // https://docs.hyperbrowser.ai/web-scraping/scrape
          const result = await hyperbrowser.scrape.startAndWait({
            url,
            scrapeOptions: {
              formats: ["markdown"],
              onlyMainContent: true,
            },
          });

          const title = result?.data?.metadata?.title ?? '';
          const description = result?.data?.metadata?.description ?? '';
          const markdown = result?.data?.markdown ?? '';

          return {
            url,
            title,
            description,
            content: markdown,
          };
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
          return {
            url,
            title: 'Failed to scrape',
            description: 'Could not extract content from this URL',
            content: ''
          };
        }
      })
    );

    return NextResponse.json({ 
      success: true,
      data: scrapeResults
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}