import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export interface HealthMarker {
  name: string;
  value: string;
  unit?: string;
  date?: string;
}

/**
 * Generate a single focused medical research query from health markers and PDF content
 * Optimized for speed - returns 1 high-quality query
 */
export async function generateResearchQueries(
  markers: HealthMarker[],
  pdfText: string
): Promise<string[]> {
  try {
    // Extract a sample of the PDF text (first 2000 chars for context)
    const textSample = pdfText.slice(0, 2000);
    
    // Build marker summary
    const markerSummary = markers.length > 0
      ? markers.slice(0, 10).map(m => `${m.name}: ${m.value} ${m.unit || ''}`).join(', ')
      : "No specific markers extracted";

    const prompt = `You are a health topic identifier. Based on health markers and lab report content, identify ONE key health topic to research.

Health Markers Found:
${markerSummary}

Lab Report Context (sample):
${textSample}

Instructions:
- Generate ONLY 1 simple health topic (2-4 words)
- Focus on the most clinically significant finding
- Use common medical terms (e.g., "cholesterol levels", "blood glucose", "vitamin D deficiency")
- Avoid complex query syntax - just the core health topic
- Examples: "high cholesterol", "diabetes risk", "iron deficiency"

Return ONLY the health topic (2-4 words), no extra text.

Topic:`;

    const result = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      prompt,
      temperature: 0.2,
      maxOutputTokens: 100, // Single query needs less tokens
    });

    // Extract the single query
    const query = result.text.trim();
    
    if (!query || query.length < 10) {
      console.error("Failed to generate research query:", result.text);
      return generateFallbackQueries(markers);
    }
    
    return [query]; // Return array with single query
  } catch (error) {
    console.error("Error generating research queries:", error);
    return generateFallbackQueries(markers);
  }
}

/**
 * Fallback health topic based on top marker when AI fails
 */
function generateFallbackQueries(markers: HealthMarker[]): string[] {
  if (markers.length === 0) {
    return ["general health screening"];
  }

  // Create ONE simple topic from the first marker
  const marker = markers[0];
  const name = marker.name.toLowerCase();
  
  let topic: string;
  if (name.includes("cholesterol")) {
    topic = "cholesterol levels";
  } else if (name.includes("glucose") || name.includes("blood sugar")) {
    topic = "blood glucose";
  } else if (name.includes("vitamin")) {
    topic = `vitamin deficiency`;
  } else if (name.includes("hemoglobin") || name.includes("hgb")) {
    topic = "hemoglobin levels";
  } else {
    topic = `${marker.name}`;
  }

  return [topic]; // Return single simple topic
}
