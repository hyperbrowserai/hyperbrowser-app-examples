import OpenAI from 'openai'
import { ScrapedSource } from './scrape'

export interface Citation {
  id: number
  url: string
  title: string
  quote: string
  endpoints: Array<{
    method: string
    url: string
    status: number
  }>
}

export interface AnswerResult {
  answerMarkdown: string
  citations: Citation[]
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function generateAnswer(
  query: string,
  sources: ScrapedSource[]
): Promise<AnswerResult> {
  // Prepare context from sources
  const context = sources.map((source, index) => ({
    id: index + 1,
    url: source.url,
    title: source.title,
    content: source.quote,
    endpoints: source.endpoints.length
  }))

  const systemPrompt = `You are an expert research assistant that provides comprehensive answers using real-time scraped sources. 

Your task is to:
1. Analyze the user's question and the provided sources
2. Generate a well-structured markdown answer that directly addresses the question
3. Include inline citations using [1], [2], etc. format referencing the source IDs
4. Provide specific, actionable information when possible
5. If APIs or endpoints are mentioned in sources, reference them appropriately

Guidelines:
- Use markdown formatting (headers, lists, code blocks, etc.)
- Cite sources inline with [number] format
- Be comprehensive but concise
- Focus on answering the specific question asked
- If technical information is available, include it
- Use a professional but accessible tone`

  const userPrompt = `Question: ${query}

Sources:
${context.map(source => `
Source [${source.id}]:
Title: ${source.title}
URL: ${source.url}
Content: ${source.content}
API Endpoints Found: ${source.endpoints}
`).join('\n')}

Please provide a comprehensive answer to the question using these sources. Include inline citations using [1], [2], etc.`

  const openai = getOpenAIClient()
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  })

  const answerMarkdown = completion.choices[0]?.message?.content || 'No answer generated'

  // Extract citations from the answer
  const citationMatches = answerMarkdown.match(/\[(\d+)\]/g) || []
  const citationIds = [...new Set(citationMatches.map(match => parseInt(match.slice(1, -1))))]

  const citations: Citation[] = citationIds
    .map(id => {
      const source = sources[id - 1]
      if (!source) return null
      
      return {
        id,
        url: source.url,
        title: source.title,
        quote: source.quote,
        endpoints: source.endpoints.map(ep => ({
          method: ep.method,
          url: ep.url,
          status: ep.status
        }))
      }
    })
    .filter((citation): citation is Citation => citation !== null)

  return {
    answerMarkdown,
    citations
  }
} 