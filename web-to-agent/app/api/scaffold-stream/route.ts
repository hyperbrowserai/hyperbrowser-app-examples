import { NextRequest } from 'next/server';
import Together from 'together-ai';
import { ScaffoldRequestSchema } from '@/lib/types';

// Create TogetherAI client
const together = process.env.TOGETHER_API_KEY 
  ? new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!together) {
      return new Response('TOGETHER_API_KEY is required', { status: 500 });
    }

    const body = await request.json();
    const { actions, url } = ScaffoldRequestSchema.parse(body);

    const prompt = `
Generate TypeScript tool functions for interacting with ${url} using only official Hyperbrowser SDK methods.

Actions to implement:
${JSON.stringify(actions, null, 2)}

Requirements:
1. Use ONLY these Hyperbrowser methods:
   - hyperbrowser.sessions.create()
   - hyperbrowser.sessions.navigate()
   - hyperbrowser.sessions.click()
   - hyperbrowser.sessions.type()
   - hyperbrowser.sessions.select()
   - hyperbrowser.sessions.evaluate()
   - hyperbrowser.sessions.screenshot()
   - hyperbrowser.sessions.getHTML()
   - hyperbrowser.sessions.delete()

2. Each function should:
   - Accept typed parameters using Zod schemas
   - Create a stealth session
   - Navigate to the URL
   - Perform the action
   - Return results with screenshots
   - Clean up the session

3. Include proper error handling and retries
4. Use TypeScript with strict typing
5. Export all functions and schemas

Generate a complete TypeScript file with:
- Imports for Hyperbrowser SDK and Zod
- Zod schemas for each function's input
- Implementation of each tool function
- Export statements

Return ONLY the TypeScript code, no explanations.
`;

    // Create a streaming response manually since AI SDK has compatibility issues
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await together.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages: [
              {
                role: 'system',
                content: 'You are an expert TypeScript developer specializing in web automation tools. Generate clean, production-ready code.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.1,
            stream: true,
          });

          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // Format as AI SDK streaming format for compatibility with frontend
              const data = `0:${JSON.stringify({ textDelta: content })}\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
          }
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Scaffold stream error:', error);
    return new Response('Failed to stream scaffold response', { status: 500 });
  }
}
