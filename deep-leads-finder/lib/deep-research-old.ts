import { Hyperbrowser } from "@hyperbrowser/sdk";
import { getSession, releaseSession } from "./session-cache";

interface ResearchConfig {
  query: string;
  location?: string;
  maxPages?: number;
  extractSchema?: any;
  sessionTimeout?: number;
}

interface ResearchResult {
  query: string;
  totalPages: number;
  extractedData: any[];
  metadata: {
    sessionId: string;
    duration: number;
    sources: string[];
  };
}

/**
 * Hyperleads Research API - Chains Hyperbrowser session, batch scrape, and batch extract
 * 
 * 1. Start persistent session
 * 2. Batch scrape target sites for research topics  
 * 3. Batch extract structured data from relevant pages
 * 4. Return clean JSON results
 */
export async function deepResearch(
  hb: Hyperbrowser, 
  config: ResearchConfig
): Promise<ResearchResult> {
  const startTime = Date.now();
  const sources: string[] = [];
  const extractedData: any[] = [];
  
  console.log(`🔬 Starting FAST Hyperleads research: "${config.query}"`);
  
  // Step 1: Get reusable session for SPEED (with fallback)
  let sessionId: string;
  try {
    sessionId = await getSession(hb);
    console.log(`⚡ Using cached session: ${sessionId}`);
  } catch (error) {
    console.log(`⚠️ Session cache failed, creating direct session...`);
    const directSession = await hb.sessions.create({});
    sessionId = directSession.id;
    console.log(`🆕 Created direct session: ${sessionId}`);
  }
  
  try {
    // Step 2: BATCH multi-site strategy for maximum speed
    const researchTargets = buildResearchTargets(config.query, config.location);
    console.log(`🚀 BATCH targeting ${researchTargets.length} sources: ${researchTargets.map(t => t.name).join(', ')}`);
    
    // BATCH scraping with Hyperbrowser for maximum efficiency
    const urls = researchTargets.map(target => target.url);
    console.log(`🕷️ Starting batch scrape for ${urls.length} URLs...`);
    console.log(`📋 URLs to scrape:`, urls);
    
    // Skip batch scraping for now - use individual scraping for reliability
    console.log(`🔄 Using individual scraping for reliability (batch scraping requires Ultra plan)`);
    
    // Individual scraping approach
    for (const target of researchTargets) {
      try {
        console.log(`🔄 Individual scraping ${target.name}...`);
        
        const scrapeResult = await hb.scrape.startAndWait({
          url: target.url,
          scrapeOptions: { 
            formats: ["html", "markdown"],
            timeout: 15000
          }
        });
        
        console.log(`📄 ${target.name} scrape result:`, {
          hasHtml: !!scrapeResult.data?.html,
          htmlLength: scrapeResult.data?.html?.length || 0,
          hasMarkdown: !!scrapeResult.data?.markdown,
          markdownLength: scrapeResult.data?.markdown?.length || 0,
          hasError: !!scrapeResult.error,
          error: scrapeResult.error
        });
        
        if (scrapeResult.data?.html || scrapeResult.data?.markdown) {
          sources.push(target.name);
          
          try {
            const extractResult = await hb.extract.startAndWait({
              urls: [target.url],
              schema: config.extractSchema || getDefaultSchema(target.type)
            });
            
            console.log(`🎯 ${target.name} extraction result:`, {
              hasData: !!extractResult.data,
              dataType: typeof extractResult.data,
              dataKeys: extractResult.data ? Object.keys(extractResult.data) : []
            });
            
            if (extractResult.data) {
              extractedData.push({
                source: target.name,
                url: target.url,
                data: extractResult.data,
                timestamp: new Date().toISOString()
              });
              console.log(`✅ ${target.name}: Scraping and extraction successful`);
            }
          } catch (extractError) {
            console.error(`❌ ${target.name} extraction failed:`, extractError);
          }
        } else {
          console.warn(`⚠️ ${target.name}: No data from scrape`);
        }
      } catch (individualError) {
        console.error(`❌ ${target.name} scraping failed:`, individualError);
      }
    }
    
    console.log(`🏁 Individual scraping complete: ${sources.length}/${researchTargets.length} sources successful`);
    
    // Old batch scraping code (commented out for now)
    /*
    try {
      // Use official batch scrape API
      console.log(`🚀 Attempting batch scrape with options:`, {
        urlCount: urls.length,
        urls: urls,
        timeout: 15000
      });
      
      const batchScrapeResult = await hb.scrape.batch.startAndWait({
        urls: urls,
        scrapeOptions: { 
          formats: ["html", "markdown"],
          timeout: 15000 // 15s timeout for speed
        }
      });
      
      console.log(`✅ Batch scrape complete: ${batchScrapeResult.results?.length || 0} results`);
      console.log(`📊 Batch scrape details:`, {
        hasResults: !!batchScrapeResult.results,
        resultCount: batchScrapeResult.results?.length || 0,
        hasError: !!batchScrapeResult.error,
        error: batchScrapeResult.error
      });
      
      // Process batch results and extract data
      if (batchScrapeResult.results) {
        // Collect successful scrapes for batch extraction
        const successfulScrapes = [];
        
        for (let i = 0; i < batchScrapeResult.results.length; i++) {
          const result = batchScrapeResult.results[i];
          const target = researchTargets[i];
          
          console.log(`🔍 ${target.name} result:`, {
            hasData: !!(result.data?.html || result.data?.markdown),
            htmlLength: result.data?.html?.length || 0,
            markdownLength: result.data?.markdown?.length || 0,
            hasError: !!result.error,
            error: result.error?.message || result.error
          });
          
          if (result.data?.html || result.data?.markdown) {
            sources.push(target.name);
            console.log(`📄 ${target.name}: Scraped successfully`);
            successfulScrapes.push({ target, url: target.url, index: i });
          } else {
            console.warn(`⚠️ ${target.name}: No data scraped - ${result.error?.message || 'Unknown reason'}`);
          }
        }
        
        // Batch extract from all successful scrapes
        if (successfulScrapes.length > 0) {
          console.log(`🎯 Starting batch extraction for ${successfulScrapes.length} URLs...`);
          
          try {
            // Use batch extraction for all URLs at once
            console.log(`🎯 Extracting from URLs:`, successfulScrapes.map(s => s.url));
            const batchExtractResult = await hb.extract.startAndWait({
              urls: successfulScrapes.map(s => s.url),
              schema: config.extractSchema || getDefaultSchema('business') // Use business schema as default
            });
            
            console.log(`📊 Batch extract result:`, {
              hasData: !!batchExtractResult.data,
              dataType: typeof batchExtractResult.data,
              isArray: Array.isArray(batchExtractResult.data),
              dataKeys: batchExtractResult.data ? Object.keys(batchExtractResult.data) : []
            });
            
            if (batchExtractResult.data) {
              // Process extraction results - handle different response formats
              if (Array.isArray(batchExtractResult.data)) {
                // If data is an array, match each result to its URL
                successfulScrapes.forEach((scrape, index) => {
                  const extractData = batchExtractResult.data[index];
                  if (extractData) {
                    extractedData.push({
                      source: scrape.target.name,
                      url: scrape.url,
                      data: extractData,
                      timestamp: new Date().toISOString()
                    });
                    console.log(`✅ ${scrape.target.name}: Data extracted from array`);
                  }
                });
              } else {
                // If data is a single object, use it for all successful scrapes
                successfulScrapes.forEach((scrape) => {
                  extractedData.push({
                    source: scrape.target.name,
                    url: scrape.url,
                    data: batchExtractResult.data,
                    timestamp: new Date().toISOString()
                  });
                  console.log(`✅ ${scrape.target.name}: Data extracted from single object`);
                });
              }
            }
            
            console.log(`🎯 Batch extraction complete: ${extractedData.length} results`);
          } catch (extractError) {
            console.error(`❌ Batch extraction failed, falling back to individual:`, extractError);
            
            // Fallback to individual extraction if batch fails
            for (const scrape of successfulScrapes) {
              try {
                const extractResult = await hb.extract.startAndWait({
                  urls: [scrape.url],
                  schema: config.extractSchema || getDefaultSchema(scrape.target.type)
                });
                
                if (extractResult.data) {
                  extractedData.push({
                    source: scrape.target.name,
                    url: scrape.url,
                    data: extractResult.data,
                    timestamp: new Date().toISOString()
                  });
                  console.log(`🎯 ${scrape.target.name}: Data extracted (fallback)`);
                }
              } catch (individualError) {
                console.error(`❌ ${scrape.target.name} individual extraction failed:`, individualError);
              }
            }
          }
        }
      }
      
      console.log(`🏁 Batch complete: ${sources.length}/${researchTargets.length} sources successful`);
    } catch (batchError) {
      console.error(`❌ Batch scrape failed (might need Ultra plan), falling back to individual scraping:`, batchError);
      
      // Fallback to individual scraping - this should work on all plans
      for (const target of researchTargets) {
        try {
          console.log(`🔄 Fallback: Individual scraping ${target.name}...`);
          
          const scrapeResult = await hb.scrape.startAndWait({
            url: target.url,
            scrapeOptions: { 
              formats: ["html", "markdown"],
              timeout: 15000
            }
          });
          
          console.log(`📄 ${target.name} individual scrape result:`, {
            hasHtml: !!scrapeResult.data?.html,
            htmlLength: scrapeResult.data?.html?.length || 0,
            hasMarkdown: !!scrapeResult.data?.markdown,
            markdownLength: scrapeResult.data?.markdown?.length || 0,
            hasError: !!scrapeResult.error,
            error: scrapeResult.error
          });
          
          if (scrapeResult.data?.html || scrapeResult.data?.markdown) {
            sources.push(target.name);
            
            try {
              const extractResult = await hb.extract.startAndWait({
                urls: [target.url],
                schema: config.extractSchema || getDefaultSchema(target.type)
              });
              
              console.log(`🎯 ${target.name} extraction result:`, {
                hasData: !!extractResult.data,
                dataType: typeof extractResult.data,
                dataKeys: extractResult.data ? Object.keys(extractResult.data) : []
              });
              
              if (extractResult.data) {
                extractedData.push({
                  source: target.name,
                  url: target.url,
                  data: extractResult.data,
                  timestamp: new Date().toISOString()
                });
                console.log(`✅ ${target.name}: Individual scraping and extraction successful`);
              }
            } catch (extractError) {
              console.error(`❌ ${target.name} extraction failed:`, extractError);
            }
          } else {
            console.warn(`⚠️ ${target.name}: No data from individual scrape`);
          }
        } catch (individualError) {
          console.error(`❌ ${target.name} individual scraping failed:`, individualError);
        }
      }
    }
    
    return {
      query: config.query,
      totalPages: extractedData.length,
      extractedData,
      metadata: {
        sessionId: sessionId,
        duration: Date.now() - startTime,
        sources
      }
    };
    
  } finally {
    // Clean up session properly
    try {
      releaseSession(sessionId);
      console.log(`⚡ FAST research complete: ${extractedData.length} results in ${Date.now() - startTime}ms`);
    } catch (error) {
      // If session cache fails, stop the session directly
      console.log(`🧹 Cleaning up direct session: ${sessionId}`);
      try {
        await hb.sessions.stop(sessionId);
      } catch (stopError) {
        console.warn(`⚠️ Failed to stop session ${sessionId}:`, stopError);
      }
    }
  }
}

/**
 * Build FAST research targets optimized for Hyperbrowser batch performance
 */
function buildResearchTargets(query: string, location?: string) {
  const targets = [];
  
  // OPTIMIZED targets for speed + Hyperbrowser compatibility
  if (location) {
    targets.push({
      name: "Yelp Business",
      type: "business",
      url: `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(location)}`
    });
    
    targets.push({
      name: "Google Maps",
      type: "business", 
      url: `https://www.google.com/maps/search/${encodeURIComponent(`${query} near ${location}`)}`
    });
    
    targets.push({
      name: "Yellow Pages",
      type: "directory",
      url: `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(query)}&geo_location_terms=${encodeURIComponent(location)}`
    });
  }
  
  // Add Craigslist only for marketplace-type queries
  if (location && (query.includes('for sale') || query.includes('furniture') || query.includes('equipment'))) {
    targets.push({
      name: "Craigslist",
      type: "marketplace", 
      url: `https://${getCraigslistSubdomain(location)}.craigslist.org/search/sss?query=${encodeURIComponent(query)}`
    });
  }
  
  return targets;
}

/**
 * Get Craigslist subdomain for major cities (for speed)
 */
function getCraigslistSubdomain(location: string): string {
  const cityMap: Record<string, string> = {
    'austin': 'austin',
    'newyork': 'newyork', 
    'new york': 'newyork',
    'chicago': 'chicago',
    'san francisco': 'sfbay',
    'los angeles': 'losangeles',
    'miami': 'miami',
    'seattle': 'seattle',
    'boston': 'boston',
    'denver': 'denver'
  };
  
  const normalized = location.toLowerCase().trim();
  return cityMap[normalized] || 'craigslist'; // fallback to main site
}

/**
 * Default extraction schemas by target type (JSON Schema format)
 */
function getDefaultSchema(targetType: string) {
  const schemas = {
    marketplace: {
      type: "object",
      properties: {
        listings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              price: { type: "string" },
              location: { type: "string" },
              contact: { type: "string" },
              description: { type: "string" }
            }
          }
        }
      }
    },
    
    business: {
      type: "object", 
      properties: {
        businesses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              phone: { type: "string" },
              website: { type: "string" },
              rating: { type: "number" },
              category: { type: "string" }
            }
          }
        }
      }
    },
    
    directory: {
      type: "object",
      properties: {
        entries: {
          type: "array", 
          items: {
            type: "object",
            properties: {
              businessName: { type: "string" },
              address: { type: "string" },
              phoneNumber: { type: "string" },
              website: { type: "string" },
              category: { type: "string" }
            }
          }
        }
      }
    }
  };
  
  return schemas[targetType as keyof typeof schemas] || schemas.business;
}

/**
 * Simple sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * FAST Lead-specific research wrapper - Optimized for speed
 */
export async function findLeads(
  hb: Hyperbrowser,
  query: string, 
  location: string
) {
  return deepResearch(hb, {
    query,
    location,
    maxPages: 1, // Single page for speed
    sessionTimeout: 10, // Shorter timeout
    extractSchema: {
      type: "object",
      properties: {
        businesses: {
          type: "array",
          description: `ONLY extract businesses that specifically match: "${query}". Do NOT include restaurants, bars, or unrelated businesses.`,
          items: {
            type: "object",
            properties: {
              name: { 
                type: "string", 
                description: `Business name that specifically provides: ${query}` 
              },
              phone: { type: "string", description: "Phone number" },
              address: { type: "string", description: "Full address" },
              website: { type: "string", description: "Website URL" },
              email: { type: "string", description: "Email address" },
              category: { 
                type: "string", 
                description: `Business category related to: ${query}` 
              },
              description: { 
                type: "string", 
                description: `Description of how this business relates to: ${query}` 
              },
              relevanceScore: {
                type: "number",
                description: "Relevance score 1-10 for how well this matches the query"
              }
            },
            required: ["name", "category", "relevanceScore"]
          }
        }
      }
    }
  });
} 