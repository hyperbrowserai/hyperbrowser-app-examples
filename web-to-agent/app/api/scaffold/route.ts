import { NextRequest, NextResponse } from 'next/server';
import Together from 'together-ai';
import { ScaffoldRequestSchema, type ApiResponse, type ScaffoldResult, type GeneratedTool } from '@/lib/types';

// Initialize Together client only if API key is available
const together = process.env.TOGETHER_API_KEY 
  ? new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!together) {
      return NextResponse.json({
        success: false,
        error: 'TOGETHER_API_KEY is required'
      }, { status: 500 });
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
      max_tokens: 4000,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('No response from TogetherAI');
    }

    // Parse individual tools from the generated code
    const tools: GeneratedTool[] = actions.map(action => ({
      name: action.name,
      code: `// ${action.description}\n// Generated tool function would be extracted from full code`,
      schema: action.inputSchema,
    }));

    const result: ScaffoldResult = {
      tools,
      typescript: text,
    };

    const apiResponse: ApiResponse<ScaffoldResult> = {
      success: true,
      data: result,
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('Scaffold error:', error);
    
    const response: ApiResponse<ScaffoldResult> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scaffold tools',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
