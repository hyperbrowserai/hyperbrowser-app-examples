import OpenAI from 'openai';

// Validate API key exists
if (!process.env.OPENAI_API_KEY) {
  console.error('⚠️  OPENAI_API_KEY is not set in environment variables');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
  maxRetries: 2,
});

// Using GPT-4o-mini - fast, cost-effective, and reliable
export const MODEL = 'gpt-4o-mini';

export const generateOutline = async (topic: string, audience: string, research: string) => {
  const prompt = `Create an outline for a comprehensive page about "${topic}" for ${audience} audience.

Generate exactly 6 section titles that would make sense for this topic. Return ONLY a JSON array of strings, no other text.

Example format: ["Introduction", "Key Concepts", "Applications", "Best Practices", "Common Challenges", "Conclusion"]`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0].message.content || '[]';
    return JSON.parse(content) as string[];
  } catch (error) {
    console.error('Error generating outline:', error);
    // Return fallback outline
    return [
      "Introduction",
      "Key Features",
      "How It Works",
      "Benefits",
      "Use Cases",
      "Conclusion"
    ];
  }
};

export const generateSectionContent = async (
  topic: string,
  sectionTitle: string,
  audience: string,
  research: string
) => {
  const prompt = `Write detailed, engaging content for the "${sectionTitle}" section of a page about "${topic}" for ${audience} audience.

Requirements:
- Write 3-4 substantial paragraphs
- Be informative and comprehensive
- Use clear, accessible language
- Include specific examples where relevant
- No markdown formatting, just plain text paragraphs

Write the content now:`;

  try {
    const stream = await Promise.race([
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Content generation timeout')), 60000) // 60 second timeout
      )
    ]);

    return stream;
  } catch (error) {
    console.error('Error generating section content:', error);
    throw error;
  }
};

