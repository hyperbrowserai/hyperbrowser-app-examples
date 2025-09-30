import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';

  // Generate contextual suggestions based on the current query
  const suggestions = generateSuggestions(query);

  return NextResponse.json({ suggestions });
}

function generateSuggestions(query: string): string[] {
  const queryLower = query.toLowerCase();
  
  // Category-based suggestions
  const categories = {
    tech: [
      'latest AI developments 2024',
      'quantum computing breakthroughs',
      'blockchain innovations',
      'cybersecurity trends',
      'machine learning applications'
    ],
    business: [
      'startup funding trends 2024',
      'market analysis today',
      'economic indicators current',
      'investment strategies',
      'business automation tools'
    ],
    science: [
      'climate change solutions',
      'space exploration updates',
      'medical research breakthroughs',
      'renewable energy advances',
      'scientific discoveries 2024'
    ],
    current: [
      'global news today',
      'political developments',
      'international affairs',
      'economic updates',
      'social media trends'
    ],
    health: [
      'wellness trends 2024',
      'mental health resources',
      'nutrition science',
      'fitness innovations',
      'medical technology'
    ],
    general: [
      'best practices for productivity',
      'how to learn new skills',
      'travel destinations 2024',
      'sustainable living tips',
      'personal finance advice'
    ]
  };

  // If query is empty or very short, return trending topics
  if (query.length <= 2) {
    return [
      'latest technology trends',
      'current global events',
      'AI and machine learning news',
      'climate change solutions',
      'startup innovations 2024',
      'space exploration updates'
    ];
  }

  // Match query to categories
  let matchedSuggestions: string[] = [];
  
  // Tech keywords
  if (/ai|artificial|intelligence|tech|software|coding|programming|computer|data|cloud/i.test(queryLower)) {
    matchedSuggestions.push(...categories.tech);
  }
  
  // Business keywords
  if (/business|startup|market|economy|finance|investment|money|company/i.test(queryLower)) {
    matchedSuggestions.push(...categories.business);
  }
  
  // Science keywords
  if (/science|research|study|climate|space|medical|health|biology|physics/i.test(queryLower)) {
    matchedSuggestions.push(...categories.science);
  }
  
  // Current events keywords
  if (/news|current|today|recent|latest|update|politics|global/i.test(queryLower)) {
    matchedSuggestions.push(...categories.current);
  }
  
  // Health keywords
  if (/health|wellness|fitness|medical|nutrition|mental|exercise/i.test(queryLower)) {
    matchedSuggestions.push(...categories.health);
  }

  // If no specific matches, add general suggestions
  if (matchedSuggestions.length === 0) {
    matchedSuggestions = categories.general;
  }

  // Add query-specific suggestions
  const specificSuggestions = [
    `${query} latest news`,
    `${query} best practices`,
    `${query} 2024 trends`,
    `how to ${query}`,
    `${query} comparison`,
    `${query} guide`
  ].filter(s => s.length > query.length + 5); // Avoid too similar suggestions

  // Combine and deduplicate
  const allSuggestions = [...new Set([...specificSuggestions, ...matchedSuggestions])];
  
  // Return up to 8 suggestions, prioritizing specific ones
  return allSuggestions.slice(0, 8);
} 