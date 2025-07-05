import { Hyperbrowser } from '@hyperbrowser/sdk'
import { ScrapedSource } from './scrape'

async function searchGoogleScholarDirect(
  query: string,
  questionType: 'research' | 'medical',
  hb: Hyperbrowser,
  onLog?: (message: string) => void,
  onProgress?: (progress: number) => void
): Promise<ScrapedSource[]> {
  const sources: ScrapedSource[] = []
  
  // Construct different Scholar search queries based on question type
  const scholarQueries = questionType === 'medical' 
    ? [
        `${query} clinical trial`,
        `${query} medical study`,
        `${query}`
      ]
    : [
        `${query}`,
        `${query} research`,
        `${query} study`
      ]

  onLog?.(`🎓 Searching Google Scholar directly...`)
  
  for (let i = 0; i < Math.min(2, scholarQueries.length); i++) {
    const searchQuery = scholarQueries[i]
    onLog?.(`🔍 Scholar search: ${searchQuery}`)
    
    try {
      // Direct Google Scholar search
      const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(searchQuery)}&hl=en&num=10`
      onLog?.(`📚 Searching Google Scholar: ${scholarUrl}`)
      
      const searchResult = await hb.scrape.startAndWait({
        url: scholarUrl,
        scrapeOptions: {
          formats: ['markdown', 'html'],
          onlyMainContent: false,
          timeout: 35000,
          waitFor: 4000,
        },
        sessionOptions: {
          useStealth: true,
          adblock: true,
        }
      })
      
      if (!searchResult.data?.html) {
        onLog?.(`⚠️ No HTML content found for Scholar search: ${searchQuery}`)
        continue
      }
      
      // Extract Google Scholar results (different structure than regular Google)
      const scholarResults = extractScholarResults(searchResult.data.html)
      onLog?.(`📋 Found ${scholarResults.length} Google Scholar results`)
      
      // Process each Scholar result (limit to 3 per query)
      for (let j = 0; j < Math.min(3, scholarResults.length); j++) {
        const result = scholarResults[j]
        onProgress?.((i * 3 + j + 1) / (Math.min(2, scholarQueries.length) * 3) * 20)
        
        try {
          // Prefer PDF URL if available, otherwise use main URL
          const targetUrl = result.pdfUrl || result.url
          onLog?.(`🌐 Scraping Scholar source: ${targetUrl}${result.pdfUrl ? ' (PDF)' : ''}`)
          
          // Scrape the actual academic paper/page
          const pageResult = await hb.scrape.startAndWait({
            url: targetUrl,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true,
              timeout: 25000,
              waitFor: 3000,
            },
            sessionOptions: {
              useStealth: true,
              adblock: true,
            }
          })
          
          if (!pageResult.data?.markdown) {
            onLog?.(`⚠️ No content found for Scholar source: ${targetUrl}`)
            continue
          }
          
          // Extract academic content with better formatting
          const academicQuote = extractAcademicQuote(pageResult.data.markdown)
          
          // Create enhanced snippet with author info if available
          const enhancedSnippet = result.authors 
            ? `${result.snippet} [Authors: ${result.authors}]`
            : result.snippet
          
          // Academic sources typically don't have REST APIs
          const academicEndpoints = createAcademicEndpoints(targetUrl)
          
          sources.push({
            url: result.url, // Keep original URL for citation
            title: result.title,
            snippet: enhancedSnippet,
            quote: academicQuote || enhancedSnippet,
            endpoints: academicEndpoints
          })
          
        } catch (error) {
          onLog?.(`⚠️ Failed to scrape Scholar source ${result.url}: ${error}`)
        }
      }
      
    } catch (error) {
      onLog?.(`❌ Google Scholar search failed for "${searchQuery}": ${error}`)
      // If Scholar fails, fall back to Google search with site filter
      onLog?.(`🔄 Falling back to Google search for Scholar content...`)
      
      try {
        const fallbackUrl = `https://www.google.com/search?q=site:scholar.google.com ${encodeURIComponent(searchQuery)}&num=8`
        const fallbackResult = await hb.scrape.startAndWait({
          url: fallbackUrl,
          scrapeOptions: {
            formats: ['markdown', 'html'],
            onlyMainContent: false,
            timeout: 30000,
            waitFor: 3000,
          },
          sessionOptions: {
            useStealth: true,
            adblock: true,
          }
        })
        
        if (fallbackResult.data?.html) {
          const fallbackResults = extractAcademicResults(fallbackResult.data.html)
          onLog?.(`📋 Found ${fallbackResults.length} fallback Scholar results`)
          
          for (let k = 0; k < Math.min(2, fallbackResults.length); k++) {
            const result = fallbackResults[k]
            sources.push({
              url: result.url,
              title: result.title,
              snippet: result.snippet,
              quote: result.snippet,
              endpoints: createAcademicEndpoints(result.url)
            })
          }
        }
      } catch (fallbackError) {
        onLog?.(`⚠️ Fallback Scholar search also failed: ${fallbackError}`)
      }
    }
  }
  
  return sources
}

function extractScholarResults(html: string): Array<{ url: string; title: string; snippet: string; authors?: string; pdfUrl?: string }> {
  const results: Array<{ url: string; title: string; snippet: string; authors?: string; pdfUrl?: string }> = []
  
  try {
    // Google Scholar structure: <div class="gs_r gs_or gs_scl"> contains each result
    // Each result has <div class="gs_ri"> for main content and <div class="gs_ggs"> for PDF links
    
    // Extract individual result blocks first
    const resultBlocks = html.match(/<div class="gs_r gs_or gs_scl"[^>]*>[\s\S]*?(?=<div class="gs_r gs_or gs_scl"|<div id="gs_res_ccl_bot"|$)/g) || []
    
    for (const block of resultBlocks) {
      try {
        // Extract title and main URL from gs_rt (result title)
        const titleMatch = block.match(/<h3[^>]*class="gs_rt"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
        if (!titleMatch) continue
        
        const url = titleMatch[1]
        const rawTitle = titleMatch[2]
        
        // Clean up title (remove HTML tags and decode entities)
        const title = rawTitle
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim()
        
        // Extract authors and publication info from gs_a class
        const authorMatch = block.match(/<div class="gs_a">([\s\S]*?)<\/div>/i)
        const authors = authorMatch ? authorMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .trim() : undefined
        
        // Extract snippet from gs_rs class
        const snippetMatch = block.match(/<div class="gs_rs">([\s\S]*?)<\/div>/i)
        const snippet = snippetMatch ? snippetMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/…/g, '...')
          .trim() : ''
        
        // Extract PDF URL if available from gs_ggs section
        const pdfMatch = block.match(/<div class="gs_ggs[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?\[PDF\]/i)
        const pdfUrl = pdfMatch ? pdfMatch[1] : undefined
        
        // Only include results with valid URLs that aren't Google internal links
        if (url && title && url.startsWith('http') && !url.includes('google.com/search') && !url.includes('scholar.google.com/scholar_url')) {
          results.push({
            url: url.startsWith('/') ? `https://scholar.google.com${url}` : url,
            title,
            snippet: snippet || 'Academic source from Google Scholar',
            authors,
            pdfUrl: pdfUrl && pdfUrl.startsWith('http') ? pdfUrl : undefined
          })
        }
        
      } catch (blockError) {
        // Skip malformed blocks
        continue
      }
    }
    
    // If the new approach didn't work, fall back to the original regex patterns
    if (results.length === 0) {
      const fallbackRegex = /<div class="gs_ri"[\s\S]*?<h3[^>]*class="gs_rt"[^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<div class="gs_rs">([^<]+)<\/div>/gi
      
      let match
      while ((match = fallbackRegex.exec(html)) !== null) {
        const url = match[1]
        const title = match[2]
        const snippet = match[3]
        
        if (url.startsWith('http') && !url.includes('google.com/search')) {
          results.push({
            url: url.startsWith('/') ? `https://scholar.google.com${url}` : url,
            title: title.replace(/<[^>]*>/g, '').trim(),
            snippet: snippet.replace(/<[^>]*>/g, '').trim()
          })
        }
      }
    }
    
    // Remove duplicates based on URL
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex((r) => r.url === result.url)
    )
    
    return uniqueResults.slice(0, 8) // Limit to 8 results
    
  } catch (error) {
    console.error('Error extracting Scholar results:', error)
    return []
  }
}

export async function scrapeAcademicSources(
  query: string,
  questionType: 'research' | 'medical',
  hbApiKey: string,
  onProgress?: (progress: number) => void,
  onLog?: (message: string) => void
): Promise<ScrapedSource[]> {
  const sources: ScrapedSource[] = []
  
  const hb = new Hyperbrowser({
    apiKey: hbApiKey,
  })

  onLog?.(`🎓 Starting academic search for ${questionType} question`)
  
  // First, try direct Google Scholar search
  const scholarSources = await searchGoogleScholarDirect(query, questionType, hb, onLog, onProgress)
  sources.push(...scholarSources)
  
  // Then search other academic databases
  const otherAcademicQueries = questionType === 'medical' 
    ? [
        // PubMed search
        `site:pubmed.ncbi.nlm.nih.gov ${query}`,
        // Other medical databases
        `site:medlineplus.gov ${query}`,
        `site:ncbi.nlm.nih.gov ${query}`,
      ]
    : [
        // ResearchGate
        `site:researchgate.net ${query}`,
        // IEEE for technical research
        `site:ieeexplore.ieee.org ${query}`,
        // arXiv for preprints
        `site:arxiv.org ${query}`,
      ]

  onLog?.(`🔍 Searching additional academic databases...`)
  
  for (let i = 0; i < Math.min(3, otherAcademicQueries.length); i++) {
    const searchQuery = otherAcademicQueries[i]
    onLog?.(`🔍 Database search: ${searchQuery}`)
    
    try {
      // Use Google to search for academic sources
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=8`
      onLog?.(`📚 Searching academic database: ${googleUrl}`)
      
      const searchResult = await hb.scrape.startAndWait({
        url: googleUrl,
        scrapeOptions: {
          formats: ['markdown', 'html'],
          onlyMainContent: false,
          timeout: 30000,
          waitFor: 3000,
        },
        sessionOptions: {
          useStealth: true,
          adblock: true,
        }
      })
      
      if (!searchResult.data?.html) {
        onLog?.(`⚠️ No HTML content found for database search: ${searchQuery}`)
        continue
      }
      
      // Extract academic search results
      const academicResults = extractAcademicResults(searchResult.data.html)
      onLog?.(`📋 Found ${academicResults.length} database sources`)
      
      // Process each academic result (limit to 2 per query)
      for (let j = 0; j < Math.min(2, academicResults.length); j++) {
        const result = academicResults[j]
        onProgress?.((i * 2 + j + 1) / (Math.min(3, otherAcademicQueries.length) * 2) * 20 + 20)
        
        try {
          onLog?.(`🌐 Scraping database source: ${result.url}`)
          
          // Scrape the academic page
          const pageResult = await hb.scrape.startAndWait({
            url: result.url,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true,
              timeout: 25000,
              waitFor: 3000,
            },
            sessionOptions: {
              useStealth: true,
              adblock: true,
            }
          })
          
          if (!pageResult.data?.markdown) {
            onLog?.(`⚠️ No content found for database source: ${result.url}`)
            continue
          }
          
          // Extract academic content with better formatting
          const academicQuote = extractAcademicQuote(pageResult.data.markdown)
          
          // Academic sources typically don't have REST APIs, so we'll create minimal endpoint info
          const academicEndpoints = createAcademicEndpoints(result.url)
          
          sources.push({
            url: result.url,
            title: result.title,
            snippet: result.snippet,
            quote: academicQuote || result.snippet,
            endpoints: academicEndpoints
          })
          
        } catch (error) {
          onLog?.(`⚠️ Failed to scrape database source ${result.url}: ${error}`)
        }
      }
      
    } catch (error) {
      onLog?.(`❌ Database search failed for "${searchQuery}": ${error}`)
    }
  }
  
  return sources
}

function extractAcademicResults(html: string): Array<{ url: string; title: string; snippet: string }> {
  const results: Array<{ url: string; title: string; snippet: string }> = []
  
  try {
    // Enhanced regex for academic search results
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*><h3[^>]*>([^<]+)<\/h3>/gi
    const snippetRegex = /<span[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([^<]+)<\/span>/gi
    
    let linkMatch
    const links: Array<{ url: string; title: string }> = []
    
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const url = linkMatch[1]
      const title = linkMatch[2]
      
      // Filter for academic domains and exclude non-academic sources
      if (isAcademicSource(url)) {
        links.push({ url, title })
      }
    }
    
    // Extract snippets
    const snippets: string[] = []
    let snippetMatch
    while ((snippetMatch = snippetRegex.exec(html)) !== null) {
      snippets.push(snippetMatch[1])
    }
    
    // Combine links with snippets
    for (let i = 0; i < Math.min(links.length, 6); i++) {
      results.push({
        url: links[i].url,
        title: links[i].title,
        snippet: snippets[i] || 'Academic source content'
      })
    }
    
  } catch (error) {
    console.error('Error extracting academic results:', error)
  }
  
  return results
}

function isAcademicSource(url: string): boolean {
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
  
  return academicDomains.some(domain => url.includes(domain)) && 
         url.startsWith('http') && 
         !url.includes('google.com/search') &&
         !url.includes('youtube.com')
}

function extractAcademicQuote(markdown: string): string {
  try {
    // First, clean up the markdown to remove images, links, and formatting
    let cleanedMarkdown = markdown
    
    // Remove all image tags, base64 data, and visual elements
    cleanedMarkdown = cleanedMarkdown.replace(/!\[.*?\]\(.*?\)/g, '')
    cleanedMarkdown = cleanedMarkdown.replace(/!\[.*?\]\[.*?\]/g, '')
    cleanedMarkdown = cleanedMarkdown.replace(/data:image\/[^)]+/g, '')
    cleanedMarkdown = cleanedMarkdown.replace(/<img[^>]*>/gi, '')
    cleanedMarkdown = cleanedMarkdown.replace(/base64,[A-Za-z0-9+/=]{50,}/g, '')
    
    // Remove all links but keep the text
    cleanedMarkdown = cleanedMarkdown.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    
    // Remove HTML tags
    cleanedMarkdown = cleanedMarkdown.replace(/<[^>]*>/g, '')
    
    // Remove markdown formatting
    cleanedMarkdown = cleanedMarkdown.replace(/[#*`_]/g, '')
    
    // Remove excessive whitespace and normalize
    cleanedMarkdown = cleanedMarkdown.replace(/\s+/g, ' ')
    cleanedMarkdown = cleanedMarkdown.replace(/\n+/g, '\n')
    
    // Look for academic sections in priority order
    const academicSections = [
      /(?:abstract|summary)[:\s]*\n?(.{100,800}?)(?:\n\n|introduction|keywords|background|methodology|results|conclusion|references)/i,
      /(?:introduction|background)[:\s]*\n?(.{100,800}?)(?:\n\n|methodology|methods|results|discussion|conclusion|references)/i,
      /(?:results|findings|discussion)[:\s]*\n?(.{100,800}?)(?:\n\n|conclusion|references|limitations)/i,
      /(?:conclusion)[:\s]*\n?(.{100,600}?)(?:\n\n|references|bibliography|acknowledgments)/i
    ]
    
    for (const pattern of academicSections) {
      const match = cleanedMarkdown.match(pattern)
      if (match) {
        let quote = match[1].trim()
        
        // Clean up the quote further
        quote = quote
          .replace(/\([^)]*\d+[^)]*\)/g, '') // Remove citation numbers
          .replace(/\s*et\s+al\.?\s*/gi, ' et al. ')
          .replace(/\s{2,}/g, ' ')
          .trim()
        
        if (quote.length > 400) {
          const lastSentence = quote.substring(0, 400).lastIndexOf('.')
          if (lastSentence > 200) {
            quote = quote.substring(0, lastSentence + 1)
          }
        }
        
        return quote
      }
    }
    
    // Look for first substantial paragraph with academic indicators
    const paragraphs = cleanedMarkdown
      .split(/\n\n+/)
      .filter(p => {
        const text = p.trim()
        const hasAcademicKeywords = /(?:study|research|analysis|findings|results|methodology|participants|data|significant|hypothesis|conclusion|evidence|investigation|examination|survey|experiment|theory|model|framework|literature|review|journal|publication)/i.test(text)
        return text.length > 100 && hasAcademicKeywords
      })
    
    if (paragraphs.length > 0) {
      let quote = paragraphs[0].trim()
      
      // Skip navigation or metadata sentences
      if (quote.match(/^(jump to|skip to|download|cite|view|click|open|close|menu|navigation|home|search|browse|login|register|subscribe|contact|about|privacy|terms|copyright|doi|issn|isbn|vol|issue|page|pp|editor|publisher|printed|published|received|accepted|available|online|www|http|https|email|tel|fax|address)/i)) {
        quote = paragraphs[1]?.trim() || 'Academic content extracted from source'
      }
      
      // Clean up academic citations and references
      quote = quote
        .replace(/\([^)]*\d+[^)]*\)/g, '') // Remove citation numbers
        .replace(/\[[^\]]*\d+[^\]]*\]/g, '') // Remove reference numbers
        .replace(/\s*et\s+al\.?\s*/gi, ' et al. ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      
      if (quote.length > 400) {
        const lastSentence = quote.substring(0, 400).lastIndexOf('.')
        if (lastSentence > 200) {
          quote = quote.substring(0, lastSentence + 1)
        }
      }
      
      return quote
    }
    
    // Final fallback - first meaningful sentences
    const sentences = cleanedMarkdown.split(/[.!?]+/).filter(s => s.trim().length > 50)
    
    if (sentences.length > 0) {
      let quote = sentences[0].trim()
      
      // Skip non-content sentences
      if (quote.match(/^(jump to|skip to|download|cite|view|click|open|close|menu|navigation|home|search|browse|login|register|subscribe|contact|about|privacy|terms|copyright|doi|issn|isbn|vol|issue|page|pp|editor|publisher|printed|published|received|accepted|available|online|www|http|https|email|tel|fax|address)/i)) {
        quote = sentences[1]?.trim() || 'Academic content extracted from source'
      }
      
      if (quote.length > 300) {
        quote = quote.substring(0, 300) + '...'
      }
      
      return quote
    }
    
    return 'Academic content extracted from source'
  } catch (error) {
    return 'Academic content extracted from source'
  }
}

function createAcademicEndpoints(url: string): Array<{
  method: string
  url: string
  status: number
  headers: Record<string, string>
  payload?: any
}> {
  // Academic sources typically don't have REST APIs
  // But we can create some generic endpoints for reference
  const endpoints: Array<{
    method: string
    url: string
    status: number
    headers: Record<string, string>
    payload?: any
  }> = []
  
  try {
    const domain = new URL(url).hostname
    
    // Create generic academic endpoints based on known patterns
    if (domain.includes('pubmed')) {
      endpoints.push({
        method: 'GET',
        url: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent('research query')}`,
        status: 200,
        headers: { 'content-type': 'application/xml' }
      })
    } else if (domain.includes('arxiv')) {
      endpoints.push({
        method: 'GET',
        url: `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent('research query')}`,
        status: 200,
        headers: { 'content-type': 'application/atom+xml' }
      })
    } else if (domain.includes('scholar.google')) {
      endpoints.push({
        method: 'GET',
        url: `https://scholar.google.com/scholar?q=${encodeURIComponent('research query')}`,
        status: 200,
        headers: { 'content-type': 'text/html' }
      })
    } else {
      // Generic academic endpoint
      endpoints.push({
        method: 'GET',
        url: `${url}/api/search`,
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    }
  } catch (error) {
    // Fallback endpoint
    endpoints.push({
      method: 'GET',
      url: `${url}/api/`,
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  }
  
  return endpoints
} 