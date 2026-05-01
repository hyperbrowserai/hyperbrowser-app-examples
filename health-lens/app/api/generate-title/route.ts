import { NextRequest, NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userMessage, assistantResponse } = await request.json();

    if (!userMessage) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const prompt = `Based on this health-related conversation, generate a short, descriptive title (max 6 words).

User: ${userMessage}
${assistantResponse ? `Assistant: ${assistantResponse.substring(0, 200)}...` : ''}

Generate only the title, nothing else. Make it specific to the health topic discussed.`;

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 30,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const titleText = message.content[0].type === "text" ? message.content[0].text : "";
    const cleanTitle = titleText.trim().replace(/^["']|["']$/g, '');

    return NextResponse.json({ title: cleanTitle });
  } catch (error) {
    console.error("Title generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate title" },
      { status: 500 }
    );
  }
}
