import { Hyperbrowser } from "@hyperbrowser/sdk";

if (!process.env.HYPERBROWSER_API_KEY) {
  throw new Error("HYPERBROWSER_API_KEY environment variable is not set");
}

export const hyperbrowser = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
});

export interface ScrapedStudy {
  title: string;
  authors?: string;
  journal?: string;
  year?: string;
  publishDate?: string;
  abstract?: string;
  pmid?: string;
  source?: string;
  url?: string;
}

export interface SearchResult {
  source: "PubMed";
  studies: ScrapedStudy[];
  searchTerms: string[];
  timestamp: number;
}

/**
 * Search PubMed using E-utilities API (free, reliable, no scraping needed)
 * Step 1: esearch - find PMIDs matching query
 * Step 2: efetch - get full study data including abstracts
 */
export async function searchPubMedAPI(healthTopic: string): Promise<ScrapedStudy[]> {
  try {
    console.log(`🔍 Searching PubMed API for: "${healthTopic}"`);
    
    // Step 1: Search for PMIDs using E-utilities esearch
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(healthTopic)}&retmax=5&retmode=json&sort=relevance`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      console.error("E-search failed:", searchResponse.status);
      return createFallbackResults(healthTopic);
    }
    
    const searchData = await searchResponse.json();
    const pmids = searchData?.esearchresult?.idlist || [];
    
    if (pmids.length === 0) {
      console.log("No PMIDs found for query");
      return createFallbackResults(healthTopic);
    }
    
    console.log(`📌 Found ${pmids.length} PMIDs: ${pmids.slice(0, 3).join(', ')}`);
    
    // Step 2: Get full data including abstracts using efetch (XML format for abstracts)
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml`;
    
    const fetchResponse = await fetch(fetchUrl);
    if (!fetchResponse.ok) {
      console.error("E-fetch failed:", fetchResponse.status);
      return createBasicResults(pmids);
    }
    
    const xmlText = await fetchResponse.text();
    const studies = parseXmlToStudies(xmlText, pmids);
    
    console.log(`✅ Retrieved ${studies.length} studies with abstracts from PubMed API`);
    // Debug: Log first study's abstract to verify content
    if (studies[0]?.abstract) {
      console.log(`📝 Sample abstract (first 200 chars): "${studies[0].abstract.substring(0, 200)}..."`);
    } else {
      console.log(`⚠️ No abstracts found in studies`);
    }
    return studies.length > 0 ? studies : createFallbackResults(healthTopic);
    
  } catch (error: any) {
    console.error("PubMed API error:", error?.message || error);
    return createFallbackResults(healthTopic);
  }
}

/**
 * Parse PubMed XML response to extract study data including abstracts
 */
function parseXmlToStudies(xmlText: string, pmids: string[]): ScrapedStudy[] {
  const studies: ScrapedStudy[] = [];
  
  // Split by PubmedArticle tags to process each article
  const articleMatches = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
  
  for (const articleXml of articleMatches) {
    try {
      // Extract PMID
      const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const pmid = pmidMatch?.[1];
      if (!pmid) continue;
      
      // Extract title - handle potential nested tags
      const titleMatch = articleXml.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
      const title = cleanXmlText(titleMatch?.[1]) || `PubMed Study ${pmid}`;
      
      // Extract abstract - combine all AbstractText elements
      // Use non-greedy match to handle content between tags
      const abstractTexts: string[] = [];
      const abstractMatches = articleXml.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g);
      for (const match of abstractMatches) {
        const attrs = match[1];
        const text = cleanXmlText(match[2]);
        const labelMatch = attrs.match(/Label="([^"]+)"/);
        if (labelMatch) {
          abstractTexts.push(`${labelMatch[1]}: ${text}`);
        } else if (text) {
          abstractTexts.push(text);
        }
      }
      const abstract = abstractTexts.join(' ').substring(0, 800) || undefined;
      
      // Extract authors
      const authorMatches = [...articleXml.matchAll(/<LastName>([\s\S]*?)<\/LastName>/g)];
      const authors = authorMatches.slice(0, 3).map(m => cleanXmlText(m[1])).filter(Boolean).join(', ');
      const authorStr = authors ? (authors + (authorMatches.length > 3 ? ', et al.' : '')) : undefined;
      
      // Extract journal
      const journalMatch = articleXml.match(/<Title>([\s\S]*?)<\/Title>/);
      const journal = cleanXmlText(journalMatch?.[1]);
      
      // Extract year
      const yearMatch = articleXml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
      const year = yearMatch?.[1];
      
      studies.push({
        title,
        abstract,
        authors: authorStr,
        journal,
        year,
        pmid,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        source: "PubMed",
      });
    } catch (e) {
      console.error("Error parsing article XML:", e);
    }
  }
  
  return studies;
}

/**
 * Clean XML text by decoding entities and removing extra whitespace
 */
function cleanXmlText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, '') // Remove any nested XML tags
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

/**
 * Create basic results with just PMIDs when efetch fails
 */
function createBasicResults(pmids: string[]): ScrapedStudy[] {
  return pmids.map((pmid: string) => ({
    title: `PubMed Study ${pmid}`,
    pmid,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    source: "PubMed" as const,
  }));
}

/**
 * Scrape a specific PubMed article for detailed abstract using Hyperbrowser
 */
export async function scrapePubMedArticle(pmid: string): Promise<{ abstract?: string } | null> {
  try {
    const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
    console.log(`📄 Scraping abstract for PMID ${pmid}`);
    
    const scrapeResult = await hyperbrowser.scrape.startAndWait({ url });
    
    if (!scrapeResult?.data) {
      return null;
    }

    const content = scrapeResult.data.markdown || 
                   (typeof scrapeResult.data === "string" ? scrapeResult.data : "");

    // Look for abstract section
    const abstractMatch = content.match(/Abstract[:\s]*([\s\S]{100,2000}?)(?=\n\n|Keywords|PMID|Copyright|Background|Introduction)/i);
    
    return {
      abstract: abstractMatch?.[1]?.trim().substring(0, 1000),
    };
  } catch (error) {
    console.error(`Error scraping abstract for ${pmid}:`, error);
    return null;
  }
}

/**
 * Create fallback results with direct PubMed search link
 */
function createFallbackResults(healthTopic: string): ScrapedStudy[] {
  return [{
    title: `Search PubMed: ${healthTopic}`,
    source: "PubMed",
    url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(healthTopic)}`,
    abstract: `Click to view latest research on "${healthTopic}" from PubMed.`,
  }];
}

/**
 * Main search function - uses PubMed API for reliable results
 */
export async function searchAllSources(
  terms: string[], 
  onProgress?: (result: SearchResult) => void
): Promise<SearchResult[]> {
  try {
    const healthTopic = terms.join(" ");
    console.log(`📖 Searching PubMed for: "${healthTopic}"`);
    
    const studies = await searchPubMedAPI(healthTopic);
    
    const result: SearchResult = {
      source: "PubMed",
      studies,
      searchTerms: terms,
      timestamp: Date.now(),
    };
    
    onProgress?.(result);
    
    return [result];
  } catch (error) {
    console.error("Search failed:", error);
    const healthTopic = terms.join(" ");
    const fallbackResult: SearchResult = {
      source: "PubMed",
      studies: createFallbackResults(healthTopic),
      searchTerms: terms,
      timestamp: Date.now(),
    };
    
    onProgress?.(fallbackResult);
    return [fallbackResult];
  }
}

/**
 * Pre-scrape trending health research topics
 * Call this on app init to populate cache
 */
export async function prescrapeHealthTopics(): Promise<SearchResult[]> {
  const trendingTopics = [
    "diabetes blood glucose management",
    "cholesterol cardiovascular disease",
    "vitamin D deficiency",
  ];
  
  const results: SearchResult[] = [];
  
  for (const topic of trendingTopics.slice(0, 2)) { // Limit to 2 for speed
    try {
      const topicResults = await searchAllSources([topic]);
      results.push(...topicResults);
      console.log(`✅ Pre-fetched: ${topic}`);
    } catch (error) {
      console.error(`Failed to pre-fetch ${topic}:`, error);
    }
  }
  
  return results;
}
