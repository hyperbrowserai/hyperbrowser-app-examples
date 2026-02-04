import { NextRequest, NextResponse } from 'next/server';
import { openai, MODEL } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const { text, customPrompt } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    let prompt = '';
    
    if (customPrompt) {
      // User provided custom instruction
      prompt = `${customPrompt}. Return ONLY the edited text, no explanations:\n\n${text}`;
    } else {
      // Default rewrite
      prompt = `Rewrite the following text to make it clearer and more engaging. Keep the same meaning but improve the style and flow. Return ONLY the rewritten text, no explanations:\n\n${text}`;
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const rewrittenText = response.choices[0].message.content || text;

    return NextResponse.json({ rewrittenText });
  } catch (error) {
    console.error('Rewrite API error:', error);
    return NextResponse.json(
      { error: 'Failed to rewrite text' },
      { status: 500 }
    );
  }
}

