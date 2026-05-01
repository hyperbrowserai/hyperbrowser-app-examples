import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Using Node.js runtime for better compatibility

const CLASSIFICATION_PROMPT = `You are a medical question classifier. Analyze if a health question needs research backing from medical databases.

Questions that NEED research:
- Specific medical conditions, treatments, or medications
- Health claims about supplements, diet, exercise
- "What does research say about..."
- "Is there evidence for..."
- Questions about effectiveness, safety, or outcomes

Questions that DON'T need research:
- General symptom descriptions without specific questions
- Personal health tracking ("I feel tired today")
- Appointment scheduling or logistics
- Simple clarifications

Respond ONLY with valid JSON in this exact format:
{
  "needsSearch": true/false,
  "searchTerms": ["term1", "term2"],
  "confidence": 0.0-1.0
}`;

interface ClassificationResult {
  needsSearch: boolean;
  searchTerms: string[];
  confidence: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const provider = process.env.ANTHROPIC_API_KEY
      ? "anthropic"
      : process.env.OPENAI_API_KEY
      ? "openai"
      : null;

    if (!provider) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const model =
      provider === "anthropic"
        ? anthropic("claude-sonnet-4-5-20250929")
        : openai("gpt-4o-mini");

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: question },
      ],
      temperature: 0.3,
      maxOutputTokens: 200,
    });

    // Parse the JSON response
    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      // Default to not searching if parsing fails
      return NextResponse.json({
        needsSearch: false,
        searchTerms: [],
        confidence: 0,
      });
    }

    const classification: ClassificationResult = JSON.parse(jsonMatch[0]);

    return NextResponse.json(classification);
  } catch (error) {
    console.error("Classification error:", error);
    // Default to not searching on error
    return NextResponse.json({
      needsSearch: false,
      searchTerms: [],
      confidence: 0,
    });
  }
}

