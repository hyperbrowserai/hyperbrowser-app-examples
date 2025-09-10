import { NextRequest, NextResponse } from 'next/server';
import Together from 'together-ai';
import { MapRequestSchema, type ApiResponse, type MapResult, type Action } from '@/lib/types';

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
    const { domJson } = MapRequestSchema.parse(body);

    const prompt = `
Analyze the following DOM elements from a web page and classify them into actionable tools.

URL: ${domJson.url}
Title: ${domJson.title}

DOM Elements:
${JSON.stringify(domJson.elements, null, 2)}

Create concise actions for interactive elements:
- name: camelCase function name
- description: brief action description (max 50 chars)
- type: "click", "fill", "select", "extract", or "navigate"
- selector: CSS selector
- inputSchema: simple JSON schema

Focus on buttons, forms, links. Ignore decorative elements.

Return ONLY valid JSON:
{
  "actions": [
    {
      "name": "searchProducts",
      "description": "Search products",
      "type": "fill",
      "selector": "input[name='search']",
      "inputSchema": {
        "type": "object",
        "properties": {"query": {"type": "string"}},
        "required": ["query"]
      }
    }
  ]
}

IMPORTANT: Keep descriptions under 50 characters. Limit to max 10 actions.
`;

    const response = await together.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing web pages and creating actionable tools. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from TogetherAI');
    }

    // Parse the JSON response
    let parsedResult;
    let jsonStr = '';
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      jsonStr = jsonMatch ? jsonMatch[0] : content;
      
      // Clean up common JSON issues
      jsonStr = jsonStr
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/\n/g, ' ') // Remove newlines that break JSON
        .replace(/\s+/g, ' '); // Normalize whitespace
      
      // Try to repair truncated JSON
      if (!jsonStr.includes(']')) {
        // If missing closing bracket, try to add it
        jsonStr = jsonStr.replace(/,?\s*$/, ' ]');
      }
      if (!jsonStr.endsWith('}')) {
        // If missing closing brace, add it
        jsonStr += ' }';
      }
      
      // Remove incomplete last object if it exists
      const lastCommaIndex = jsonStr.lastIndexOf(',');
      const lastBraceIndex = jsonStr.lastIndexOf('}');
      if (lastCommaIndex > lastBraceIndex) {
        // There's a comma after the last complete object, remove everything after it
        jsonStr = jsonStr.substring(0, lastCommaIndex) + ' ] }';
      }
      
      parsedResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Raw AI response:', content);
      console.error('Cleaned JSON string:', jsonStr);
      throw new Error(`Failed to parse AI response: ${parseError}`);
    }

    // Validate the structure
    if (!parsedResult.actions || !Array.isArray(parsedResult.actions)) {
      throw new Error('Invalid response structure from AI');
    }

    // Clean and validate actions
    const actions: Action[] = parsedResult.actions
      .filter((action: { name?: string; description?: string; type?: string }) => 
        action.name && 
        action.description && 
        action.type && 
        ['click', 'fill', 'select', 'extract', 'navigate'].includes(action.type)
      )
      .map((action: { name: string; description: string; type: string; selector?: string; inputSchema?: Record<string, unknown> }) => ({
        name: action.name,
        description: action.description,
        type: action.type,
        selector: action.selector || '',
        inputSchema: action.inputSchema || {},
      }));

    const result: MapResult = { actions };

    const apiResponse: ApiResponse<MapResult> = {
      success: true,
      data: result,
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('Map error:', error);
    
    const response: ApiResponse<MapResult> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to map DOM elements',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
