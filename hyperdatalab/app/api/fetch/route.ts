import { NextRequest } from 'next/server';
import { z } from 'zod';
import { stableHash } from '@/lib/hashing';
import { fetchWithEvidence } from '@/lib/hyperbrowser';

const bodySchema = z.object({ url: z.string().url() });

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { url } = bodySchema.parse(json);
    const runId = stableHash({ url, ts: new Date().toISOString().slice(0, 10) });

    let apiKey = req.headers.get('x-api-key') || undefined;
    
    if (!apiKey) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }
    
    console.log(`[API/fetch] API key provided: ${apiKey ? 'Yes' : 'No'}`);
    
    if (!apiKey) {
      console.log('[API/fetch] No API key provided in headers, will use server config');
    } else {
      console.log(`[API/fetch] Using client-provided API key: ${apiKey.substring(0, 5)}...`);
    }
    const result = await fetchWithEvidence({ url, runId, apiKey });
    console.log(`[API/fetch] run=${runId} url=${url} htmlLen=${result.html.length} textLen=${result.text.length}`);

    return new Response(
      JSON.stringify({
        runId,
        html: result.html,
        text: result.text,
        screenshotPath: null,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[API/fetch] Error:`, message);
    
    if (message.includes('HYPERBROWSER_API_KEY')) {
      return new Response(JSON.stringify({ 
        error: 'Missing Hyperbrowser API key. Please provide an API key in the settings.',
        errorType: 'api_key_missing'
      }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
}


