import { runDeterministicLLM } from "./llm";

export type QAPair = { q: string; a: string };
export type QNAResult = { qa_pairs: QAPair[] };

export async function generateQnaFromText(text: string): Promise<QNAResult> {
  // Use AI to generate meaningful Q&A pairs from the content
  const instruction = `Analyze the following content and generate 5-8 high-quality question-answer pairs that would be useful for someone learning about this topic. 

Focus on:
- Key facts and important information
- Definitions and explanations
- How-to questions if applicable
- Common concerns or frequently asked questions

Format your response as valid JSON with this structure:
{
  "qa_pairs": [
    {"q": "What is...", "a": "The answer explaining..."},
    {"q": "How does...", "a": "The process involves..."}
  ]
}

Content to analyze:
${text.slice(0, 4000)}`;

  try {
    const response = await runDeterministicLLM(text, instruction);
    
    // Try to parse the JSON response
    const parsed = JSON.parse(response);
    if (parsed.qa_pairs && Array.isArray(parsed.qa_pairs)) {
      return { qa_pairs: parsed.qa_pairs };
    }
    
    // Fallback if parsing fails
    return { qa_pairs: [{ q: "What is this content about?", a: text.slice(0, 200) + "..." }] };
  } catch (error) {
    console.error("QnA generation failed:", error);
    // Fallback Q&A
    return { 
      qa_pairs: [
        { q: "What is this content about?", a: text.slice(0, 200) + "..." },
        { q: "What are the key points?", a: "Please refer to the original content for detailed information." }
      ] 
    };
  }
}


