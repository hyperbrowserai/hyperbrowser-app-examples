import { openai, MODEL } from './openai';

/**
 * Generate a meaningful Unsplash search query from a topic and section title
 * Removes dates, numbers, and converts concepts to visual search terms
 */
export const generateImageQuery = async (topic: string, sectionTitle: string): Promise<string> => {
  // Fast fallback: use simple text processing instead of AI
  // This is much faster and more reliable
  
  // Combine topic and section title, clean it up
  const combined = `${topic} ${sectionTitle}`;
  
  // Remove common words and clean up
  let query = combined
    .replace(/\d{4}/g, '') // Remove years
    .replace(/in\s+\d+/gi, '') // Remove "in 2026"
    .replace(/\b(the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|may|might|can|must|hero|image)\b/gi, '') // Remove common words
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .trim()
    .split(' ')
    .filter(word => word.length > 2) // Remove very short words
    .slice(0, 2) // Take first 2 meaningful words
    .join(' ');
  
  // If empty, use topic
  if (!query || query.length < 3) {
    query = topic.replace(/\d{4}/g, '').trim();
  }
  
  console.log(`🎨 Image query for "${sectionTitle}": "${query}"`);
  return query;
};

