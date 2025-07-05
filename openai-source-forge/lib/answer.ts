import OpenAI from 'openai'
import { ScrapedSource } from './scrape'

export interface Citation {
  id: number
  url: string
  title: string
  quote: string
  domain: string
  isAcademic: boolean
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

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname
    return domain.replace('www.', '')
  } catch (error) {
    return 'unknown'
  }
}

function checkIfAcademicSource(url: string): boolean {
  const academicDomains = [
    'scholar.google.com',
    'pubmed.ncbi.nlm.nih.gov',
    'ncbi.nlm.nih.gov',
    'researchgate.net',
    'ieeexplore.ieee.org',
    'arxiv.org',
    'medlineplus.gov',
    'nih.gov',
    'springer.com',
    'nature.com',
    'sciencedirect.com',
    'jstor.org',
    'wiley.com',
    'tandfonline.com',
    'plos.org',
    'bmj.com',
    'nejm.org',
    'jama.jamanetwork.com',
    'sciencemag.org',
    'cell.com',
    'frontiersin.org',
    'mdpi.com',
    'academic.oup.com',
    'cambridge.org',
    'sage.com',
    'acm.org',
    'mitpressjournals.org'
  ]
  
  return academicDomains.some(domain => url.includes(domain))
}

function cleanQuoteContent(content: string): string {
  if (!content) return 'Content excerpt from this source'
  
  let cleaned = content
  
  // Remove base64 encoded images and data URIs
  cleaned = cleaned.replace(/data:image\/[^)\s]+/g, '')
  
  // Remove markdown image syntax
  cleaned = cleaned.replace(/!\[.*?\]\([^)]*\)/g, '')
  
  // Remove HTML img tags
  cleaned = cleaned.replace(/<img[^>]*>/gi, '')
  
  // Remove HTML tags except basic formatting
  cleaned = cleaned.replace(/<(?!\/?(b|strong|i|em|u|br|p|div|span|code|pre))[^>]*>/gi, '')
  
  // Remove markdown link syntax that's incomplete
  cleaned = cleaned.replace(/\[!\[.*?\]\([^)]*\)\]/g, '')
  
  // Remove orphaned brackets and parentheses
  cleaned = cleaned.replace(/\[\]/g, '')
  cleaned = cleaned.replace(/\(\)/g, '')
  cleaned = cleaned.replace(/!\[\]/g, '')
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim()
  
  // Check if the cleaned content is too short or contains only weird characters
  const weirdCharPattern = /^[^\w\s]*$/
  const tooShort = cleaned.length < 10
  const onlyWeirdChars = weirdCharPattern.test(cleaned)
  const mostlySymbols = cleaned.replace(/[^\w\s]/g, '').length < cleaned.length * 0.3
  
  if (tooShort || onlyWeirdChars || mostlySymbols) {
    return 'Content excerpt from this source - click Visit to read more'
  }
  
  // Limit length and add ellipsis if needed
  if (cleaned.length > 300) {
    cleaned = cleaned.substring(0, 300) + '...'
  }
  
  return cleaned
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
- Use a professional but accessible tone
- DO NOT include a "References" or "Sources" section in your answer - citations will be displayed separately
- Keep your answer clean and focused on content, not source listings`

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
      
      const domain = extractDomain(source.url)
      const isAcademic = checkIfAcademicSource(source.url)
      
      return {
        id,
        url: source.url,
        title: source.title,
        quote: cleanQuoteContent(source.quote),
        domain,
        isAcademic,
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