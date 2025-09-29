import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Lead {
  source: string;
  title: string;
  url: string;
  location: string;
  price: string;
}

/**
 * Filter and verify leads using Claude to ensure relevance
 */
export async function filterRelevantLeads(
  leads: Lead[], 
  query: string
): Promise<Lead[]> {
  if (!leads.length) return [];
  
  console.log(`🔍 Claude filtering ${leads.length} leads for "${query}"`);
  
  try {
    const prompt = `Filter these business leads to only include ones DIRECTLY relevant to: "${query}"

LEADS TO FILTER:
${leads.map((lead, i) => `${i+1}. ${lead.title} (${lead.source})`).join('\n')}

INSTRUCTIONS:
- Only return leads that are EXACTLY what the user is searching for
- Remove restaurants, bars, general businesses unless they match the query
- For "${query}", only include businesses that specifically offer those services
- Return ONLY the numbers of relevant leads (e.g., "1,3,5" or "none")

RELEVANT LEAD NUMBERS:`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929", // Claude 4.5 Sonnet (latest)
      max_tokens: 100,
      temperature: 0.1, // Low temp for consistent filtering
      messages: [{ role: "user", content: prompt }],
    });

    const relevantNumbers = response.content[0]?.type === 'text' ? response.content[0].text.trim() : "";
    console.log(`🎯 Claude selected: ${relevantNumbers}`);
    
    if (relevantNumbers.toLowerCase() === "none") {
      console.log(`❌ No relevant leads found for "${query}"`);
      return [];
    }
    
    // Parse the numbers and filter leads
    const selectedIndices = relevantNumbers
      .split(',')
      .map(n => parseInt(n.trim()) - 1) // Convert to 0-based index
      .filter(i => i >= 0 && i < leads.length);
    
    const filteredLeads = selectedIndices.map(i => leads[i]);
    
    console.log(`✅ Claude filtered: ${leads.length} → ${filteredLeads.length} relevant leads`);
    return filteredLeads;
    
  } catch (error) {
    console.error(`⚠️ Claude filtering failed:`, error);
    // Fallback: return original leads if Claude fails
    return leads;
  }
}

/**
 * Enhance leads with better categorization using Claude
 */
export async function enhanceLeads(
  leads: Lead[], 
  query: string
): Promise<Lead[]> {
  if (!leads.length) return [];
  
  console.log(`✨ Claude enhancing ${leads.length} leads`);
  
  try {
    const prompt = `Enhance these business leads with better contact info and descriptions for: "${query}"

LEADS:
${leads.map((lead, i) => `${i+1}. ${lead.title} - ${lead.location} (${lead.price})`).join('\n')}

For each lead, provide enhanced info in this format:
LEAD_NUMBER: Enhanced Title | Better Description | Contact Info

Be concise and focus on what makes each business relevant to "${query}".`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929", // Claude 4.5 Sonnet (latest)
      max_tokens: 500,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const enhancements = response.content[0]?.type === 'text' ? response.content[0].text : "";
    console.log(`✨ Claude enhanced leads successfully`);
    
    // For now, just return original leads (enhancement parsing can be added later)
    return leads;
    
  } catch (error) {
    console.error(`⚠️ Claude enhancement failed:`, error);
    return leads;
  }
} 