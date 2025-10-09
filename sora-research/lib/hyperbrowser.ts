import { Hyperbrowser } from '@hyperbrowser/sdk';

export interface PlatformPricing {
  platform: string;
  url: string;
  pricing_model: string;
  estimated_cost: string;
  cost_per_second?: string;
  credits_per_generation?: string;
  features: string[];
  supports_style: boolean;
  recommendation_score: number;
}

export interface VideoComplexityFactors {
  duration: number;
  hasAudio: boolean;
  hasSpeech: boolean;
  visualComplexity: 'simple' | 'moderate' | 'complex';
  cameraMovement: boolean;
  multipleSubjects: boolean;
  detailedEnvironment: boolean;
  styleComplexity: 'simple' | 'moderate' | 'complex';
}

export function createHyperbrowserClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error('HYPERBROWSER_API_KEY is not set');
  }
  return new Hyperbrowser({ apiKey });
}

export async function getPlatformPricing(
  client: Hyperbrowser, 
  factors: VideoComplexityFactors
): Promise<PlatformPricing[]> {
  const pricing: PlatformPricing[] = [];
  
  const platforms = [
    {
      name: 'OpenAI Sora',
      url: 'https://openai.com/sora',
      pricingUrl: 'https://openai.com/api/pricing/',
    },
    {
      name: 'Runway Gen-3',
      url: 'https://runwayml.com/pricing',
      pricingUrl: 'https://runwayml.com/pricing',
    },
    {
      name: 'Pika Labs',
      url: 'https://pika.art/pricing',
      pricingUrl: 'https://pika.art/pricing',
    }
  ];

  for (const platform of platforms) {
    try {
      console.log(`\n🔍 Scraping pricing data from ${platform.name}...`);
      console.log(`URL: ${platform.pricingUrl}`);
      
      // Scrape the pricing page with rendered JavaScript (with retry and timeout)
      const scrapeWithRetry = async (): Promise<{ data: unknown }> => {
        const maxAttempts = 3;
        let lastError: unknown = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const withTimeout = async <T>(p: Promise<T>, ms: number): Promise<T> => {
              return await new Promise<T>((resolve, reject) => {
                const t = setTimeout(() => reject(new Error('scrape timeout')), ms);
                p.then((v) => { clearTimeout(t); resolve(v); })
                 .catch((e) => { clearTimeout(t); reject(e); });
              });
            };
            const res = await withTimeout(client.scrape.startAndWait({ url: platform.pricingUrl }) as Promise<{ data: unknown }>, 20000);
            return res;
          } catch (err) {
            lastError = err;
            if (attempt === maxAttempts) break;
            await new Promise(r => setTimeout(r, 500 * attempt));
          }
        }
        throw lastError;
      };

      const result = await scrapeWithRetry();
      
      const scrapedData = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
      console.log(`✓ Scraped ${scrapedData.length} characters from ${platform.name}`);
      
      // Save scraped content snippet for debugging
      // Avoid logging full content blobs in production; keep short
      const snippet = scrapedData.substring(0, 200).replace(/\n/g, ' ');
      console.log(`Content preview: ${snippet}...`);
      
      // Extract pricing information from scraped content
      const extractedPricing = extractPricingFromContent(scrapedData, platform.name);
      
      console.log(`${platform.name} extraction result:`, extractedPricing);
      
      // Only use scraped data if we successfully extracted it
      if (!extractedPricing.costPerSecond) {
        console.error(`❌ ${platform.name}: Failed to extract pricing from scraped content`);
        console.log(`Scraped data sample (first 1000 chars):`, scrapedData.substring(0, 1000));
        throw new Error('Pricing extraction failed - no cost data found');
      }
      
      const costPerSecond = extractedPricing.costPerSecond;
      const pricingModel = extractedPricing.model || 'Subscription';
      const features = extractedPricing.features.length > 0 ? extractedPricing.features : ['Video generation'];
      
      console.log(`✅ ${platform.name} LIVE PRICING: ${costPerSecond}/sec (${pricingModel})`);
      
      // Calculate estimated cost based on all video factors
      const baseCost = estimateCost(costPerSecond, factors, platform.name);
      const score = calculateRecommendationScore(platform.name, factors, baseCost);

      pricing.push({
        platform: platform.name,
        url: platform.url,
        pricing_model: pricingModel,
        estimated_cost: baseCost,
        cost_per_second: costPerSecond,
        features: features,
        supports_style: true,
        recommendation_score: score,
      });
    } catch (error) {
      console.error(`❌ Skipping ${platform.name} - scraping/extraction failed:`, error);
      // Skip this platform entirely - no hardcoded fallbacks
    }
  }

  // Sort by recommendation score (highest first)
  return pricing.sort((a, b) => b.recommendation_score - a.recommendation_score);
}

function extractPricingFromContent(content: string, platformName: string): {
  costPerSecond: string | null;
  model: string | null;
  features: string[];
} {
  console.log(`Extracting pricing for ${platformName} from ${content.length} chars`);
  
  // Extract features by looking for common video generation features
  const features: string[] = [];
  const featurePatterns = [
    { pattern: /text[\s-]*to[\s-]*video/i, feature: 'Text-to-video' },
    { pattern: /image[\s-]*to[\s-]*video/i, feature: 'Image-to-video' },
    { pattern: /lip[\s-]*sync/i, feature: 'Lip-sync' },
    { pattern: /camera\s+control/i, feature: 'Camera controls' },
    { pattern: /1080p|1920\s*[x×]\s*1080/i, feature: '1080p resolution' },
    { pattern: /720p|1280\s*[x×]\s*720/i, feature: '720p resolution' },
    { pattern: /extend|elongate/i, feature: 'Extend videos' },
    { pattern: /commercial\s+(?:use|license)/i, feature: 'Commercial use' },
    { pattern: /api\s+access/i, feature: 'API access' },
    { pattern: /sound\s+effect/i, feature: 'Sound effects' },
    { pattern: /storyboard/i, feature: 'Storyboard mode' },
    { pattern: /motion\s+control/i, feature: 'Motion control' },
  ];
  
  for (const { pattern, feature } of featurePatterns) {
    if (pattern.test(content)) {
      features.push(feature);
    }
  }
  
  // Extract pricing model
  let model: string | null = null;
  if (/credit[\s-]*based|pay\s+with\s+credits/i.test(content)) {
    model = 'Credits-based';
  } else if (/subscription|monthly\s+plan|per\s+month/i.test(content)) {
    model = 'Subscription';
  } else if (/token[\s-]*based|pay\s+with\s+tokens/i.test(content)) {
    model = 'Token-based';
  } else if (/api\s+credit/i.test(content)) {
    model = 'API Credits';
  }
  
  // Extract cost per second - improved patterns
  let costPerSecond: string | null = null;
  
  // Platform-specific extraction logic with better regex patterns
  if (platformName === 'OpenAI Sora') {
    // Sora pricing patterns: look for dollar amounts and credits
    const patterns = [
      /\$\s*(\d+\.?\d*)\s*(?:USD)?\s*per\s+second/i,
      /\$\s*(\d+\.?\d*)\s*\/\s*second/i,
      /(\d+)\s*credits?\s*per\s+second/i,
      /video\s+generation.*?\$\s*(\d+\.?\d*)/i,
      /1080p.*?\$\s*(\d+\.?\d*)\s*(?:per|\/)\s*(?:sec|second)/i,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        // If it's credits, convert (rough estimate: 10 credits = $1)
        if (pattern.source.includes('credit')) {
          costPerSecond = `$${(value / 10).toFixed(3)}`;
        } else {
          costPerSecond = `$${value}`;
        }
        break;
      }
    }
  } else if (platformName === 'Runway Gen-3') {
    // Runway patterns: credits per generation
    const patterns = [
      /gen[\s-]*3.*?(\d+)\s*credits/i,
      /(\d+)\s*credits\s*(?:per|for|\/)\s*(?:5|10)[\s-]*sec/i,
      /video.*?(\d+)\s*credits/i,
      /\$\s*(\d+\.?\d*)\s*per\s+second/i,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        // Runway: ~10 credits per 5s video, ~$0.01 per credit
        if (value > 1) { // It's credits
          costPerSecond = `$${((value * 0.01) / 5).toFixed(3)}`;
        } else {
          costPerSecond = `$${value}`;
        }
        break;
      }
    }
  } else if (platformName === 'Pika Labs') {
    // Pika patterns: subscription based
    const patterns = [
      /\$\s*(\d+)[\s\/]*(?:per\s+)?month/i,
      /standard.*?\$\s*(\d+)/i,
      /pro.*?\$\s*(\d+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const monthlyPrice = parseInt(match[1]);
        costPerSecond = `$${(monthlyPrice / 150 / 3).toFixed(3)}`;
        break;
      }
    }
  }
  
  // Generic fallback: look for any dollar amount patterns
  if (!costPerSecond) {
    const genericPatterns = [
      /\$\s*(\d+\.?\d*)\s*(?:USD)?\s*per\s+second/i,
      /\$\s*(\d+\.?\d*)\s*\/\s*(?:sec|second)/i,
      /pricing.*?\$\s*(\d+\.?\d*)/i,
    ];
    
    for (const pattern of genericPatterns) {
      const match = content.match(pattern);
      if (match) {
        costPerSecond = `$${match[1]}`;
        break;
      }
    }
  }
  
  console.log(`${platformName} extracted:`, { costPerSecond, model, featuresCount: features.length });
  
  return {
    costPerSecond,
    model,
    features
  };
}

function estimateCost(costPerSecondStr: string, factors: VideoComplexityFactors, platformName: string): string {
  // Extract numeric values from cost strings
  const match = costPerSecondStr.match(/\$([\d.]+)/);
  if (!match) return 'Contact for pricing';
  
  const costPerSecond = parseFloat(match[1]);
  
  // Simple calculation: cost per second × duration
  // No complexity multipliers - platforms charge flat rates
  const estimatedCost = costPerSecond * factors.duration;
  
  console.log(`${platformName} cost calculation:`, {
    costPerSecond: `$${costPerSecond}/sec`,
    duration: `${factors.duration}s`,
    totalCost: `$${estimatedCost.toFixed(2)}`
  });
  
  // Format based on magnitude
  if (estimatedCost < 0.10) return `$${estimatedCost.toFixed(3)}`;
  if (estimatedCost < 1) return `$${estimatedCost.toFixed(2)}`;
  if (estimatedCost < 10) return `$${estimatedCost.toFixed(2)}`;
  return `$${Math.round(estimatedCost)}`;
}

function calculateRecommendationScore(
  platform: string, 
  factors: VideoComplexityFactors, 
  estimatedCost: string
): number {
  let score = 50; // Base score
  
  // Parse cost
  const costMatch = estimatedCost.match(/\$([\d.]+)/);
  const cost = costMatch ? parseFloat(costMatch[1]) : 10;
  
  // Lower cost = higher score (but with diminishing returns)
  const costScore = Math.max(0, 35 - Math.log10(cost + 1) * 15);
  score += costScore;
  
  // Platform-specific quality and capability adjustments
  if (platform === 'OpenAI Sora') {
    score += 25; // Best quality and longest videos
    // Sora excels at complex videos with audio
    if (factors.hasSpeech) score += 5;
    if (factors.visualComplexity === 'complex') score += 5;
    if (factors.duration > 10) score += 5;
  } else if (platform === 'Runway Gen-3') {
    score += 18; // Good balance of quality and speed
    if (factors.duration <= 10) score += 5;
    if (factors.cameraMovement) score += 3;
  } else if (platform === 'Pika Labs') {
    score += 12;
    // Pika is better for short, simple videos
    if (factors.duration <= 5 && factors.visualComplexity !== 'complex') score += 8;
    if (!factors.hasAudio) score -= 5; // Less good without audio features
  }
  
  // Duration-based scoring
  if (factors.duration <= 5) {
    score += 5; // Short videos are easier
  } else if (factors.duration > 15) {
    // Penalize platforms that don't support long videos well
    if (platform !== 'OpenAI Sora') score -= 15;
  }
  
  // Audio capability scoring
  if (factors.hasAudio) {
    if (platform === 'OpenAI Sora' || platform === 'Pika Labs') {
      score += 3; // Better audio support
    }
  }
  
  // Complexity matching - penalize if platform isn't suited for the complexity
  if (factors.visualComplexity === 'complex' || factors.styleComplexity === 'complex') {
    if (platform === 'OpenAI Sora' || platform === 'Runway Gen-3') {
      score += 5; // Can handle complexity
    } else if (platform === 'Pika Labs') {
      score -= 8; // Not ideal for complex videos
    }
  }
  
  return Math.min(100, Math.max(0, Math.round(score)));
}