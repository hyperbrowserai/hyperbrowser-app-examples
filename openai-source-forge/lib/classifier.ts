import OpenAI from 'openai'

export type QuestionType = 'technical' | 'research' | 'medical'

export interface QuestionClassification {
  type: QuestionType
  confidence: number
  reasoning: string
}

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function classifyQuestion(query: string): Promise<QuestionClassification> {
  const openai = getOpenAIClient()
  
  const systemPrompt = `You are an expert question classifier. Your task is to classify questions into one of three categories:

1. "technical" - Programming, software development, API usage, coding problems, web development, system architecture, etc.
2. "research" - Academic research, scientific studies, literature reviews, theoretical concepts, scholarly topics, etc.
3. "medical" - Medical conditions, treatments, healthcare, pharmaceuticals, clinical studies, medical procedures, etc.

Respond with a JSON object containing:
- type: one of "technical", "research", or "medical"
- confidence: a number between 0 and 1 representing your confidence
- reasoning: a brief explanation of your classification

Examples:
- "How to implement OAuth2 in Node.js?" → technical
- "What are the latest findings on Alzheimer's disease?" → medical
- "Impact of climate change on marine ecosystems" → research
- "Best practices for React performance optimization" → technical
- "Effectiveness of meditation on anxiety disorders" → medical
- "Historical analysis of Roman Empire expansion" → research`

  const userPrompt = `Classify this question: "${query}"`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using the cheaper model for classification
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 200,
    })

    const response = completion.choices[0]?.message?.content || ''
    const classification = JSON.parse(response) as QuestionClassification
    
    // Validate the response
    if (!['technical', 'research', 'medical'].includes(classification.type)) {
      throw new Error('Invalid classification type')
    }
    
    if (classification.confidence < 0 || classification.confidence > 1) {
      throw new Error('Invalid confidence score')
    }
    
    return classification
    
  } catch (error) {
    console.error('Classification error:', error)
    // Default to technical if classification fails
    return {
      type: 'technical',
      confidence: 0.5,
      reasoning: 'Classification failed, defaulting to technical'
    }
  }
} 