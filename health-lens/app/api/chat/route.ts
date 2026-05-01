import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { NextRequest } from "next/server";

// Using Node.js runtime for better compatibility

function getTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

const SYSTEM_PROMPT = `You are a knowledgeable health AI assistant. Analyze health data and provide insights based on medical research.

IMPORTANT: You have access to the user's uploaded medical files (lab reports, health records, etc.) in the context below. When a user asks about their lab results or health data, USE THE FILE CONTENT provided in the context to give specific, personalized answers based on their actual data.

When responding:
1. Reference specific values from their uploaded files when relevant
2. Cite evidence from medical literature when relevant
3. Note limitations and uncertainties
4. Suggest questions for their doctor
5. Provide actionable next steps

Format your response with clear sections using markdown:
- Use **bold** for emphasis
- Use bullet points for lists
- DO NOT use emojis in your response. Keep the tone professional, clean, and clinical.

Always include a short **Data references** section at the end:
- List the specific uploaded file names and values you used
- List research sources with URLs when available
- If no external sources were used, state "Data references: None"

CRITICAL: Always remind users this is informational only and not medical advice. Lab results should be discussed with their healthcare provider.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const uiMessages = body?.messages;
    const researchContext = body?.researchContext;
    const memoryContext = body?.memoryContext;

    if (!Array.isArray(uiMessages)) {
      return new Response("messages must be an array", { status: 400 });
    }

    const provider =
      process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : null;

    if (!provider) {
      return new Response("API key not configured", { status: 500 });
    }

    const coreMessages = uiMessages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({
        role: m.role,
        content:
          typeof m.content === "string"
            ? m.content
            : Array.isArray(m.parts)
              ? getTextFromParts(m.parts)
              : "",
      }))
      .filter((m: any) => m.content && m.content.trim().length > 0);

    // Build enhanced system prompt with research context and memory
    let systemPrompt = SYSTEM_PROMPT;
    
    // Add memory context (files + conversation history)
    if (memoryContext && typeof memoryContext === "string" && memoryContext.trim().length > 0) {
      systemPrompt += `\n\n## Context from User's Health History:\n${memoryContext}\n\nUse this context to provide personalized responses and remember previous discussions.`;
    }
    
    // Add research context
    if (researchContext && Array.isArray(researchContext) && researchContext.length > 0) {
      const researchSummary = researchContext
        .map((result: any) => {
          const studies = result.studies || [];
          return `\n**${result.source}:**\n${studies
            .map((s: any) => {
              let details = `- **${s.title || "Study"}** ${s.year ? `(${s.year})` : ""}`;
              if (s.abstract) details += `\n  _Abstract/Snippet:_ ${s.abstract}`;
              if (s.keyOutcomes) details += `\n  _Key Outcomes:_ ${s.keyOutcomes}`;
              return details;
            })
            .join("\n")}`;
        })
        .join("\n");

      // Debug: Log what research is being passed to LLM
      const totalStudies = researchContext.reduce((acc: number, r: any) => acc + (r.studies?.length || 0), 0);
      const studiesWithAbstracts = researchContext.reduce((acc: number, r: any) => 
        acc + (r.studies?.filter((s: any) => s.abstract)?.length || 0), 0);
      console.log(`📚 Passing ${totalStudies} studies to LLM (${studiesWithAbstracts} with abstracts)`);
      
      systemPrompt += `\n\n## Recent Research Found:\n${researchSummary}\n\nPlease reference these sources in your response when relevant. Use the abstract/outcomes to provide specific details.`;
    }

    const model =
      provider === "anthropic"
        ? anthropic("claude-sonnet-4-5-20250929")
        : openai("gpt-4o-mini");

    const result = await streamText({
      model,
      system: systemPrompt,
      messages: coreMessages,
      temperature: 0.5,
      maxOutputTokens: 1500,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(error?.message || "Internal server error", { status: 500 });
  }
}
