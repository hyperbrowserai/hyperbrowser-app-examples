import { NextRequest, NextResponse } from 'next/server';
import Hyperbrowser from '@hyperbrowser/sdk';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, question, hyperbrowserKey, anthropicKey } = body;

    if (!hyperbrowserKey) {
      return NextResponse.json(
        { error: 'Hyperbrowser API key is required' },
        { status: 400 }
      );
    }

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { error: 'At least one URL is required' },
        { status: 400 }
      );
    }

    const client = new Hyperbrowser({ apiKey: hyperbrowserKey });
    const results = [];

    // Scrape all URLs in parallel
    const scrapePromises = urls.map(async (url: string) => {
      try {
        console.log(`Starting scrape for: ${url}`);
        const scrapeResult = await client.scrape.startAndWait({
          url,
          scrapeOptions: {
            formats: ['markdown', 'html'],
          }
        });

        if (scrapeResult.data) {
          console.log(`Successfully scraped: ${url}`);
          return {
            url,
            title: scrapeResult.data.metadata?.title || url,
            content: scrapeResult.data.markdown?.substring(0, 15000) || scrapeResult.data.html?.substring(0, 15000) || '',
            metadata: scrapeResult.data.metadata
          };
        } else {
          console.log(`No data returned for: ${url}`);
          return {
            url,
            title: url,
            content: 'No data returned from scrape',
            error: true,
            metadata: null
          };
        }
      } catch (err: any) {
        console.error(`Failed to scrape ${url}:`, err);
        return {
          url,
          title: url,
          content: `Failed to scrape: ${err.message || 'Unknown error'}`,
          error: true,
          metadata: null
        };
      }
    });

    const scrapedResults = await Promise.all(scrapePromises);
    // Keep all results, even errors, to show user what happened
    results.push(...scrapedResults);

    // Use Claude to synthesize if Anthropic key provided
    let synthesis = '';
    let comparisons: any[] = [];
    let scores: any[] = [];

    if (anthropicKey && results.some(r => !r.error)) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey });
        
        // Build context from all scraped pages
        const successfulResults = results.filter(r => !r.error);
        const context = successfulResults
          .map((r, i) => `\n\n[Source ${i + 1}: ${r.title || r.url}]\nURL: ${r.url}\n${r.content}`)
          .join('\n');

        const prompt = question || 'Compare and analyze these sources. Provide key insights and differences.';
        
        console.log(`Analyzing ${successfulResults.length} successful sources out of ${results.length} total URLs`);

        const message = await anthropic.messages.create({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `${prompt}

Here are the sources to analyze:
${context}

Please provide:
1. A comprehensive synthesis (2-3 paragraphs)
2. Numerical scores for EVERY source provided (1-10 scale)
3. Key comparisons in structured format

IMPORTANT: You must analyze ALL ${successfulResults.length} sources provided. Do not skip any.

Format your response as:
SYNTHESIS:
[your analysis here]

SCORES:
Source: [Source 1 name/title]
Pricing: [1-10, where 10 = best value]
Features: [1-10]
Ease of Use: [1-10]
Performance: [1-10]
Support: [1-10]
Overall: [1-10]

Source: [Source 2 name/title]
[repeat same format for ALL sources]

COMPARISONS:
Category: [name]
- [Source name]: [value/insight]
- [Source name]: [value/insight]`
          }]
        });

        const fullResponse = message.content[0].type === 'text' ? message.content[0].text : '';
        
        // Parse the response
        const parts = fullResponse.split(/SCORES:|COMPARISONS:/);
        synthesis = parts[0].replace('SYNTHESIS:', '').trim();

        // Parse scores
        if (parts[1]) {
          const scoresPart = parts[1].trim();
          const sourceBlocks = scoresPart.split(/Source:/g).filter(b => b.trim());
          
          sourceBlocks.forEach(block => {
            const lines = block.trim().split('\n');
            const name = lines[0].trim();
            const scoreObj: any = { name, scores: {} };
            
            lines.slice(1).forEach(line => {
              const match = line.match(/(Pricing|Features|Ease of Use|Performance|Support|Overall):\s*(\d+(?:\.\d+)?)/i);
              if (match) {
                const key = match[1].toLowerCase().replace(/\s+/g, '_');
                scoreObj.scores[key] = parseFloat(match[2]);
                if (key === 'overall') scoreObj.overall = parseFloat(match[2]);
              }
            });
            
            if (Object.keys(scoreObj.scores).length > 0) {
              scores.push(scoreObj);
            }
          });
        }

        // Try to extract comparisons (simplified parsing)
        const comparisonsPart = parts[2] || '';
        const comparisonBlocks = comparisonsPart.split(/Category:/g).filter(b => b.trim());
        
        comparisons = comparisonBlocks.slice(0, 5).map(block => {
          const lines = block.trim().split('\n');
          const category = lines[0].trim();
          const items = lines.slice(1)
            .filter(l => l.includes(':'))
            .map(l => {
              const [name, value] = l.split(':').map(s => s.trim().replace(/^-\s*/, ''));
              return { name, value };
            });
          return { category, items };
        });

      } catch (err: any) {
        console.error('Claude analysis error:', err);
        synthesis = 'Analysis unavailable. Add your Anthropic API key for AI-powered insights.';
      }
    } else {
      synthesis = 'Add your Anthropic API key in settings to enable AI-powered analysis and comparison.';
    }

    return NextResponse.json({
      success: true,
      synthesis,
      comparisons,
      results,
      scores
    });

  } catch (error: any) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: error.message || 'Research failed' },
      { status: 500 }
    );
  }
}

