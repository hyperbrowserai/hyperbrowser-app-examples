import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { scrapedData, message } = await req.json();

    if (!scrapedData || !Array.isArray(scrapedData) || scrapedData.length === 0) {
      return NextResponse.json({ error: 'No scraped content provided' }, { status: 400 });
    }

    // Format the scraped content for chat
    const formattedContent = scrapedData.map(data => 
      `Source: ${data.url}\nTitle: ${data.title}\nDescription: ${data.description}\n\nContent:\n${data.content}`
    ).join('\n\n---\n\n');

    // Generate a response using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that provides accurate information based on the latest web data. 
Your responses should be:
- Based solely on the provided web content
- Clear and concise
- Well-structured
- Include source attribution when relevant`
        },
        {
          role: 'user',
          content: `I have gathered the following information from multiple websites:\n\n${formattedContent}\n\nBased on this data, please answer: ${message}`
        }
      ],
      temperature: 0.7,
      // Using max_completion_tokens instead of max_tokens as per error message
      max_completion_tokens: 1000
    });

    return NextResponse.json({ 
      message: completion.choices[0].message.content,
      sources: scrapedData.map(d => d.url)
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}