import { NextRequest, NextResponse } from 'next/server';
import { scrapePage } from '../../../lib/scrape';
import { searchHumans, createJob, getJobStatus } from '../../../lib/humanpages';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    const hbKey = process.env.HYPERBROWSER_API_KEY;
    const hpKey = process.env.HUMANPAGES_API_KEY;

    if (!hbKey) {
      return NextResponse.json(
        { error: 'HYPERBROWSER_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: 'Missing required field: url' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Stream progress updates to the client
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (type: string, data: Record<string, any>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
          );
        };

        const progress = (message: string) => send('progress', { message });

        try {
          // ── Step 1: Try Hyperbrowser ──────────────────────────────
          send('step', { step: 'scrape', status: 'active' });
          progress('Starting automated scrape with Hyperbrowser...');

          const result = await scrapePage({
            url,
            apiKey: hbKey,
            onProgress: progress,
          });

          if (result.success) {
            send('step', { step: 'scrape', status: 'success' });
            progress('Scrape completed successfully!');
            send('result', {
              source: 'hyperbrowser',
              title: result.title,
              content: result.content.slice(0, 5000), // Cap for display
              url: result.url,
            });
            controller.close();
            return;
          }

          // ── Step 2: Scrape failed — try Human Pages ──────────────
          send('step', { step: 'scrape', status: 'failed' });
          progress(
            `Automated scrape failed: ${result.failureReason}. Falling back to Human Pages...`
          );

          if (!hpKey) {
            send('step', { step: 'human', status: 'failed' });
            progress(
              'HUMANPAGES_API_KEY not set — cannot fall back to human. Set it in .env.local to enable fallback.'
            );
            send('result', {
              source: 'none',
              error: 'Scrape failed and Human Pages fallback is not configured.',
              failureReason: result.failureReason,
            });
            controller.close();
            return;
          }

          send('step', { step: 'human', status: 'active' });

          // Search for an available human
          progress('Searching for available humans with web task skills...');
          let humans;
          try {
            humans = await searchHumans(hpKey);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            progress(`Human search failed: ${msg}`);
            send('step', { step: 'human', status: 'failed' });
            send('result', {
              source: 'none',
              error: `Scrape failed and human search also failed: ${msg}`,
              failureReason: result.failureReason,
            });
            controller.close();
            return;
          }

          if (!humans || humans.length === 0) {
            progress('No humans available right now. Try again later.');
            send('step', { step: 'human', status: 'failed' });
            send('result', {
              source: 'none',
              error: 'Scrape failed and no humans are currently available.',
              failureReason: result.failureReason,
            });
            controller.close();
            return;
          }

          const human = humans[0];
          progress(
            `Found human: ${human.name || human.id} (rating: ${human.rating ?? 'N/A'})`
          );

          // Create a job for the human
          progress('Creating job offer...');
          let job;
          try {
            job = await createJob(hpKey, {
              humanId: human.id,
              title: `Scrape page: ${url}`,
              description: [
                `Please visit this URL and extract the full visible text content:`,
                ``,
                `${url}`,
                ``,
                `The automated scraper was blocked (reason: ${result.failureReason}).`,
                `Please copy and paste all visible text from the page.`,
              ].join('\n'),
              priceUsdc: 0.25,
              deadlineHours: 1,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            progress(`Job creation failed: ${msg}`);
            send('step', { step: 'human', status: 'failed' });
            send('result', {
              source: 'none',
              error: `Scrape failed and job creation also failed: ${msg}`,
              failureReason: result.failureReason,
            });
            controller.close();
            return;
          }

          progress(`Job created: ${job.id}. Waiting for human to accept...`);

          // Poll for job completion (up to 60 seconds for demo purposes)
          const maxPolls = 12;
          const pollInterval = 5000;
          let completed = false;

          for (let i = 0; i < maxPolls; i++) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));

            try {
              const status = await getJobStatus(hpKey, job.id);
              progress(`Job status: ${status.status}`);

              if (status.status === 'completed' && status.result) {
                completed = true;
                send('step', { step: 'human', status: 'success' });
                progress('Human completed the task!');
                send('result', {
                  source: 'humanpages',
                  title: `Scraped by human: ${url}`,
                  content: status.result.slice(0, 5000),
                  url,
                  jobId: job.id,
                  humanId: human.id,
                });
                controller.close();
                return;
              }

              if (status.status === 'cancelled') {
                progress('Job was cancelled by the human.');
                break;
              }
            } catch {
              progress('Error checking job status, will retry...');
            }
          }

          if (!completed) {
            send('step', { step: 'human', status: 'pending' });
            progress(
              'Job is still in progress. Check back later using the job ID.'
            );
            send('result', {
              source: 'humanpages-pending',
              jobId: job.id,
              humanId: human.id,
              message:
                'A human has been hired but has not yet completed the task. The job will continue in the background.',
              url,
            });
          }

          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          send('error', { error: errorMessage });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in scrape API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Human Fallback Scrape Endpoint',
    method: 'POST',
    body: { url: 'https://example.com' },
    description:
      'Tries Hyperbrowser first. If blocked, falls back to Human Pages to hire a real human.',
  });
}
