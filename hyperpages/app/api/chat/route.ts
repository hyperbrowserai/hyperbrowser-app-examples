import { NextRequest, NextResponse } from 'next/server';
import { openai, MODEL } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const { message, pageContent, topic } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const prompt = `You are a helpful research assistant helping someone understand a topic about "${topic}".

Here is the content from their research page:
${pageContent.slice(0, 3000)} // Limit context to avoid token limits

Based on this content, answer the user's question: "${message}"

Guidelines:
- Be concise and clear
- Reference specific information from the content when possible
- If the question isn't covered in the content, say so politely
- Use a friendly, helpful tone
- Keep responses under 200 words`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful research assistant. Answer questions based on the provided research content.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const assistantResponse = response.choices[0].message.content || 'I apologize, but I could not generate a response.';

    return NextResponse.json({ response: assistantResponse });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    );
  }
}

