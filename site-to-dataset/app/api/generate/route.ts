import { NextRequest } from 'next/server';
import { scrapeAndChunk } from '@/lib/scrape';
import { generateQAPairs, QAPair } from '@/lib/qa';
import { getTemplate } from '@/lib/templates';
import { crawlAndScrape, CrawlOptions } from '@/lib/crawler';

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const { url, templateId = 'general', crawlMode = false, crawlOptions } = await request.json();
  
  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  // Create a TransformStream to stream the response
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let writerClosed = false;
  
  // Helper function to safely write to stream
  const safeWrite = async (data: string) => {
    if (!writerClosed) {
      try {
        await writer.write(encoder.encode(data));
      } catch (error) {
        console.error('Error writing to stream:', error);
        writerClosed = true;
      }
    }
  };
  
  // Helper function to safely close stream
  const safeClose = async () => {
    if (!writerClosed) {
      try {
        await writer.close();
        writerClosed = true;
      } catch (error) {
        console.error('Error closing stream:', error);
        writerClosed = true;
      }
    }
  };
  
        // Start processing in the background
  (async () => {
    try {
      // Log function to write to the stream
      const log = async (message: string) => {
        await safeWrite(JSON.stringify({ type: 'log', message }) + '\n');
      };
      
      // Progress function to update progress
      const updateProgress = async (value: number) => {
        await safeWrite(JSON.stringify({ type: 'progress', value }) + '\n');
      };

      // Get the selected template
      const template = getTemplate(templateId);
      if (!template) {
        await log(`[ERROR] Invalid template ID: ${templateId}`);
        return;
      }
      
      await log(`[TEMPLATE] Using ${template.name} template for Q/A generation`);
      
      // 1. Scrape content (single page or multi-page crawl)
      let allChunks: Array<{ text: string; sourceUrl: string }> = [];
      
      if (crawlMode && crawlOptions) {
        await log(`[CRAWLER] Starting multi-page crawl with max ${crawlOptions.maxPages} pages`);
        
        const crawlResults = await crawlAndScrape(url, crawlOptions as CrawlOptions, (progress, message) => {
          log(message);
          // Update progress for crawling phase (0-40%)
          const crawlProgress = Math.min(40, (progress.current / progress.total) * 40);
          updateProgress(crawlProgress);
        });
        
        // Combine all chunks from all pages
        for (const result of crawlResults) {
          if (result.chunks.length > 0) {
            allChunks.push(...result.chunks);
          }
        }
        
        await log(`[CRAWLER] Completed crawl: ${crawlResults.length} pages processed, ${allChunks.length} total chunks`);
        await updateProgress(50); // 50% progress after crawling
      } else {
        await log(`[SCRAPE] Processing single page: ${url}`);
        allChunks = await scrapeAndChunk(url, log);
        await log(`[SCRAPE] Found ${allChunks.length} content chunks`);
        await updateProgress(50); // 50% progress after scraping
      }
      
      // Check if we have chunks to process
      if (allChunks.length === 0) {
        await log('[ERROR] No content chunks found to process');
        await updateProgress(100);
        await safeWrite(JSON.stringify({ 
          type: 'result', 
          qaPairs: [] 
        }) + '\n');
        return;
      }
      
      // 2. Generate Q/A pairs
      const progressStep = 50 / allChunks.length; // Remaining 50% divided by chunks
      
      const qaPairsWithProgress = async (chunks: { text: string; sourceUrl: string }[]) => {
        const qaPairs: QAPair[] = [];
        let currentProgress = 50;
        
        for (let i = 0; i < chunks.length; i++) {
          const { text, sourceUrl } = chunks[i];
          
          await log(`[GPT] Processing chunk ${i + 1}/${chunks.length}`);
          
          try {
            // Import OpenAI here to avoid server component issues
            const OpenAI = (await import('openai')).default;
            const openai = new OpenAI({
              apiKey: process.env.OPENAI_API_KEY,
            });
            
            const response = await openai.chat.completions.create({
              model: 'gpt-5-nano',
              messages: [
                {
                  role: 'system',
                  content: template.systemPrompt
                },
                {
                  role: 'user',
                  content: template.userPrompt.replace('{{CONTENT}}', text)
                }
              ],
              response_format: { type: 'json_object' },
              temperature: template.temperature,
            });
            
            const content = response.choices[0]?.message?.content;
            
            if (content) {
              try {
                const parsed = JSON.parse(content) as { question: string; answer: string };
                const pair = {
                  question: parsed.question,
                  answer: parsed.answer,
                  source_url: sourceUrl
                };
                
                qaPairs.push(pair);
                
                // Send the QA pair to the client
                await safeWrite(JSON.stringify({ type: 'qaPair', pair }) + '\n');
                
                await log(`[GPT] Generated Q/A pair ${i + 1}/${chunks.length}`);
              } catch (error) {
                await log(`[GPT] Error parsing response for chunk ${i + 1}: ${error}`);
              }
            }
          } catch (error) {
            await log(`[GPT] Error generating Q/A for chunk ${i + 1}: ${error}`);
          }
          
          // Update progress
          currentProgress += progressStep;
          await updateProgress(Math.min(99, currentProgress)); // Cap at 99% until complete
        }
        
        return qaPairs;
      };
      
      const qaPairs = await qaPairsWithProgress(allChunks);
      
      // Complete
      await updateProgress(100);
      await log('[COMPLETE] Processing finished');
      
      // Send final results
      await safeWrite(JSON.stringify({ 
        type: 'result', 
        qaPairs: qaPairs 
      }) + '\n');
      
    } catch (error) {
      await safeWrite(
        JSON.stringify({
          type: 'log',
          message: `[ERROR] ${error instanceof Error ? error.message : String(error)}`,
        }) + '\n'
      );
    } finally {
      await safeClose();
    }
  })();
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 