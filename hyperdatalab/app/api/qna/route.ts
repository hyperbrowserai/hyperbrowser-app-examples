import { NextRequest } from 'next/server';
import { z } from 'zod';
import { OpenAI } from 'openai';
import { createHBClient } from '@/lib/hyperbrowser';

const bodySchema = z.object({
  runId: z.string().min(1),
  url: z.string().url().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
});

type Qna = {
  question: string;
  answer: string;
  source_url: string;
  passage: string;
  confidence: number;
  tags?: string[];
};

// removed file-based readers; operate on inline payload only

function sanitizeToPlainText(input: string): string {
  const looksHtml = /<[^>]+>/.test(input);
  if (!looksHtml) return input;
  const withoutScripts = input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim();
}

function splitByTokens(text: string, targetTokens = 2000, overlapTokens = 150): string[] {
  // naive token approximation: 4 chars ~ 1 token
  const approxToken = (s: string) => Math.ceil(s.length / 4);
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let buf: string[] = [];
  let tokens = 0;
  for (const w of words) {
    const t = approxToken(w + ' ');
    if (tokens + t > targetTokens && buf.length > 0) {
      const chunk = buf.join(' ').trim();
      chunks.push(chunk);
      // overlap
      const overlapCount = Math.max(0, Math.floor((overlapTokens * 4) / 5));
      buf = buf.slice(Math.max(0, buf.length - overlapCount));
      tokens = approxToken(buf.join(' '));
    }
    buf.push(w);
    tokens += t;
  }
  if (buf.length) chunks.push(buf.join(' ').trim());
  return chunks;
}

function dedupeQna(items: Qna[]): Qna[] {
  const seen = new Set<string>();
  const out: Qna[] = [];
  for (const it of items) {
    const key = it.question.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

function toCsv(items: Qna[]): string {
  const cols = ['question','answer','source_url','passage','confidence'];
  const esc = (s: string) => '"' + (s || '').replace(/"/g, '""') + '"';
  const header = cols.join(',');
  const lines = items.map(i => [i.question, i.answer, i.source_url, i.passage, String(i.confidence)].map(esc).join(','));
  return [header, ...lines].join('\n');
}

interface ParsedQnaResult {
  qna?: Array<Partial<Qna>>;
}

function parseJsonLenient(content: string): ParsedQnaResult | null {
  let c = (content || '').trim();
  // strip code fences
  c = c.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '');
  try { return JSON.parse(c); } catch {}
  // try to extract the first JSON object
  const m = c.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { runId, url, text: bodyText, html: bodyHtml } = bodySchema.parse(await req.json());
    const baseText = (bodyText && bodyText.trim().length > 0)
      ? bodyText
      : (bodyHtml ? sanitizeToPlainText(bodyHtml) : '');
    if (!baseText) throw new Error('No text provided for QnA extraction');
    const text = baseText;
    const chunks = splitByTokens(text);
    console.log(`[API/qna] run=${runId} textLen=${text.length} chunks=${chunks.length}`);

    let apiKey = req.headers.get('x-api-key') || undefined;
    
    if (!apiKey) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }
    
    console.log(`[API/qna] API key provided: ${apiKey ? 'Yes' : 'No'}`);
    
    if (apiKey) {
      try {
        await createHBClient(apiKey);
        console.log(`[API/qna] Using client-provided API key: ${apiKey.substring(0, 5)}...`);
      } catch (err) {
        console.error('[API/qna] Invalid client API key, falling back to server config');
        apiKey = undefined;
      }
    } else {
      console.log('[API/qna] No API key provided in headers, will use server config');
    }
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.error('[API/qna] Missing OPENAI_API_KEY');
      throw new Error('Missing OpenAI API key. Please set the OPENAI_API_KEY environment variable.');
    }
    
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const all: Qna[] = [];
    for (const chunk of chunks) {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a QnA extractor. From the provided passage TEXT ONLY, generate 3-10 factual question-answer pairs. Do NOT create QnA about formatting, JSON, schemas, instructions, guidelines, or URLs. Base answers strictly on the passage. Output ONLY raw JSON (no prose, no code fences) with key "qna".'
          },
          {
            role: 'user',
            content: `{"source_url":"${url || ''}","passage":${JSON.stringify(chunk)}}`
          },
        ],
      });

      const content = resp.choices?.[0]?.message?.content || '';
      const parsed = parseJsonLenient(content);
      const items = (parsed?.qna || []) as Qna[];
      if (items.length === 0) console.log(`[API/qna] chunk yielded 0 items; len=${chunk.length}`);
      for (const it of items) {
        all.push({
          question: it.question || '',
          answer: it.answer || '',
          source_url: it.source_url || url || '',
          passage: it.passage || chunk.slice(0, 1000),
          confidence: Number(it.confidence ?? 0.7),
          tags: it.tags || [],
        });
      }

      if (items.length === 0 && chunk.split(/\s+/).length > 80) {
        const alt = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Transform key claims into QnA from the passage TEXT ONLY. No meta questions about schemas/JSON/URLs. Output ONLY raw JSON object {"qna": [...]} (no prose, no fences).' },
            { role: 'user', content: JSON.stringify({ source_url: url || '', passage: chunk }) },
          ],
        });
        const altContent = alt.choices?.[0]?.message?.content || '';
        try {
          const p2 = parseJsonLenient(altContent);
          const extra = (p2?.qna || []) as Qna[];
          for (const it of extra) {
            all.push({
              question: it.question || '',
              answer: it.answer || '',
              source_url: it.source_url || url || '',
              passage: it.passage || chunk.slice(0, 1000),
              confidence: Number(it.confidence ?? 0.65),
              tags: it.tags || [],
            });
          }
        } catch {}
      }
    }

    // html fallback path removed since we already normalized baseText above

    if (all.length === 0) {
      const singleSlice = text.slice(0, 18000);
      console.log(`[API/qna] last-chance sliceLen=${singleSlice.length}`);
      try {
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Extract 5-10 factual QnA pairs from the passage TEXT ONLY. Output ONLY a JSON object with key "qna" as an array of {"question": string, "answer": string}. No prose, no code fences.' },
            { role: 'user', content: JSON.stringify({ passage: singleSlice }) },
          ],
        });
        const content = resp.choices?.[0]?.message?.content || '';
        const parsed = parseJsonLenient(content);
        const basic = (parsed?.qna || []) as Array<{ question: string; answer: string }>;
        console.log(`[API/qna] last-chance produced ${basic?.length || 0} items`);
        for (const it of basic) {
          all.push({
            question: it.question || '',
            answer: it.answer || '',
            source_url: url || '',
            passage: '',
            confidence: 0.7,
            tags: [],
          });
        }
      } catch {}
    }

    const merged = dedupeQna(all)
      .filter(i => i.question && i.answer)
      .filter(i => !/\b(schema|json|format|source[_ ]?url)\b/i.test(i.question));

    // Build artifacts in-memory
    const qLens = merged.map(m => m.question.length);
    const aLens = merged.map(m => m.answer.length);
    const completeness = merged.length === 0 ? 0 : Math.round((merged.filter(m => m.answer.trim().length > 0).length / merged.length) * 100);
    const dupRatio = all.length === 0 ? 0 : Math.round(((all.length - merged.length) / all.length) * 100);
    const metrics = {
      total_pairs: merged.length,
      unique_questions: merged.length,
      avg_question_len: Math.round(qLens.reduce((a,b)=>a+b,0)/(qLens.length||1)),
      avg_answer_len: Math.round(aLens.reduce((a,b)=>a+b,0)/(aLens.length||1)),
      completeness,
      duplicate_ratio: dupRatio,
    };
    const csvContent = toCsv(merged);
    const jsonlContent = merged.map((o) => JSON.stringify(o)).join('\n');
    const csvDataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
    const jsonlDataUrl = `data:application/x-ndjson;charset=utf-8,${encodeURIComponent(jsonlContent)}`;

    const columns = ['question','answer','source_url','passage','confidence'];
    const sampleRows = merged.slice(0, 100).map((m) => ({
      question: m.question,
      answer: m.answer,
      source_url: m.source_url,
      passage: m.passage,
      confidence: m.confidence,
    }));

    return new Response(JSON.stringify({
      runId,
      files: {
        jsonlDataUrl,
        csvDataUrl,
      },
      metrics,
      columns,
      sampleRows,
    }), { status: 200, headers: { 'content-type': 'application/json' }});
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[API/qna] Error:`, message);
    
    if (message.includes('OPENAI_API_KEY')) {
      return new Response(JSON.stringify({ 
        error: 'Missing OpenAI API key. Please set the OPENAI_API_KEY environment variable.',
        errorType: 'openai_key_missing'
      }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    
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
      headers: { 'content-type': 'application/json' }
    });
  }
}


