import OpenAI from 'openai';

export interface QAPair {
  question: string;
  answer: string;
  source_url: string;
}

export async function generateQAPairs(
  chunks: { text: string; sourceUrl: string }[],
  progressCallback?: (message: string) => void
): Promise<QAPair[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const qaPairs: QAPair[] = [];
  const BATCH_SIZE = 5; // Process 5 chunks at a time

  progressCallback?.(`[GPT] Processing ${chunks.length} chunks in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
    
    progressCallback?.(`[GPT] Processing batch ${batchNumber}/${totalBatches} (chunks ${i + 1}-${Math.min(i + BATCH_SIZE, chunks.length)})`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async ({ text, sourceUrl }, batchIndex) => {
      const chunkNumber = i + batchIndex + 1;
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-5-nano',
          messages: [
            {
              role: 'system',
              content: `You are an expert at creating high-quality question-answer pairs for LLM fine-tuning datasets. Your goal is to generate training data that will teach language models to be helpful, accurate, and informative.

QUALITY GUIDELINES:
- Create questions that users would realistically ask about this content
- Make answers comprehensive but concise (2-4 sentences ideal)
- Focus on actionable, factual, or educational information
- Avoid overly specific details that won't generalize well
- Ensure the answer can stand alone without referencing "the text" or "this document"

QUESTION TYPES TO PRIORITIZE:
- How-to questions ("How do I...", "How can I...")
- What-is questions ("What is...", "What does... mean?")
- Why questions ("Why should...", "Why does...")
- Troubleshooting ("What if...", "How to fix...")
- Best practices ("What's the best way to...")

Return your response in JSON format with "question" and "answer" fields.`
            },
            {
              role: 'user',
              content: `Create one high-quality question-answer pair from this content. The question should be something a user would naturally ask, and the answer should be helpful and complete.

Please respond in JSON format:
{
  "question": "your question here",
  "answer": "your comprehensive answer here"
}

Content: "${text}"`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3, // Lower temperature for more consistent, focused outputs
        });

        const content = response.choices[0]?.message?.content;
        
        if (content) {
          try {
            const parsed = JSON.parse(content) as { question: string; answer: string };
            
            // Basic quality checks
            if (parsed.question && parsed.answer && 
                parsed.question.length > 10 && parsed.answer.length > 20 &&
                parsed.question.includes('?')) {
              return {
                question: parsed.question,
                answer: parsed.answer,
                source_url: sourceUrl
              };
            } else {
              progressCallback?.(`[GPT] Skipping low-quality Q/A for chunk ${chunkNumber}`);
              return null;
            }
          } catch (error) {
            progressCallback?.(`[GPT] Error parsing response for chunk ${chunkNumber}: ${error}`);
            return null;
          }
        }
        return null;
      } catch (error) {
        progressCallback?.(`[GPT] Error generating Q/A for chunk ${chunkNumber}: ${error}`);
        return null;
      }
    });

    // Wait for all promises in this batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Add successful results to the main array
    const successfulResults = batchResults.filter((result): result is QAPair => result !== null);
    qaPairs.push(...successfulResults);
    
    progressCallback?.(`[GPT] Batch ${batchNumber}/${totalBatches} completed. Generated ${successfulResults.length}/${batch.length} Q/A pairs. Total: ${qaPairs.length}`);
    
    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  progressCallback?.(`[GPT] Completed with ${qaPairs.length}/${chunks.length} Q/A pairs`);
  return qaPairs;
} 