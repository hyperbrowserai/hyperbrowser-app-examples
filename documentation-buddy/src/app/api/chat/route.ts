import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  documentation: z.object({
    url: z.string(),
    pages: z.array(z.object({
      title: z.string(),
      content: z.string(),
      url: z.string(),
    })),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, documentation } = chatSchema.parse(body);

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1]?.content || '';
    
    // Create context from documentation if provided
    let contextPrompt = '';
    if (documentation && documentation.pages.length > 0) {
      // Find relevant documentation chunks based on user query
      const relevantDocs = findRelevantDocumentation(userMessage, documentation.pages);
      
      if (relevantDocs.length > 0) {
        const totalPages = documentation.pages.length;
        const siteName = extractSiteName(documentation.url);
        
        contextPrompt = `You are a comprehensive documentation assistant with access to the complete ${siteName} documentation (${totalPages} pages crawled and processed). You have extensive knowledge about this documentation and can answer questions confidently based on the content provided.

IMPORTANT GUIDELINES:
- You HAVE ACCESS to the comprehensive documentation knowledge base
- Provide direct, detailed answers using the documentation content
- Be confident - you have the full documentation context available
- Include specific details, examples, and explanations from the documentation
- Reference specific sections or pages when helpful
- Only say you "don't have access" if the specific information is truly not covered in any of the crawled pages

FORMATTING REQUIREMENTS:
- Use proper markdown formatting in your responses
- Wrap ALL code examples in triple backticks with language specification (e.g., \`\`\`javascript, \`\`\`bash, \`\`\`python)
- Use inline code backticks for short code snippets, commands, or technical terms
- Format lists, headers, and other content using proper markdown syntax
- Always specify the programming language for code blocks when known

Available Documentation Content (${totalPages} pages total):
${documentation.pages.map((doc, index) => `
Page ${index + 1}: ${doc.title}
Source: ${doc.url}
`).join('')}

Current Query Context (Most Relevant Sections):
${relevantDocs.map(doc => `
=== ${doc.title} ===
Source: ${doc.url}
Content: ${doc.content}
`).join('\n')}

Answer the user's question comprehensively using your complete documentation knowledge base. Remember to format code examples properly with markdown code blocks.`;
      }
    }

    const systemMessage = contextPrompt || `
You are a helpful documentation assistant. The user hasn't provided any documentation context yet, so let them know they need to crawl some documentation first to get accurate answers about specific products or services.

Always format your responses using proper markdown, including code blocks with language specification when showing code examples.
`;

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemMessage,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.3, 
      maxTokens: 1200, 
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Chat error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function findRelevantDocumentation(query: string, docs: Array<{title: string, content: string, url: string}>) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  
  // Check if this is a broad question about the documentation scope/completeness
  const scopeQuestions = [
    'whole', 'entire', 'complete', 'all', 'everything', 'comprehensive', 
    'knowledgebase', 'knowledge base', 'full', 'total', 'scope'
  ];
  const isScopeQuestion = scopeQuestions.some(word => queryLower.includes(word));
  
  // If asking about scope/completeness, return more documents for comprehensive overview
  if (isScopeQuestion) {
    return docs.slice(0, 8); // Return more docs for scope questions
  }
  
  // Score each document based on relevance
  const scoredDocs = docs.map(doc => {
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    
    let score = 0;
    
    // Higher score for exact keyword matches
    queryWords.forEach(word => {
      // Title matches are very important
      if (titleLower.includes(word)) score += 5;
      
      // Content matches
      const wordMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score += wordMatches * 1;
      
      // Boost for important keywords
      if (['endpoint', 'api', 'sdk', 'method', 'function'].includes(word)) {
        score += wordMatches * 2;
      }
    });
    
    // Boost score for exact phrase matches
    if (contentLower.includes(queryLower)) score += 10;
    if (titleLower.includes(queryLower)) score += 15;
    
    // Boost for API/technical documentation
    if (titleLower.includes('api') || titleLower.includes('reference') || titleLower.includes('sdk')) {
      score += 3;
    }
    
    return { ...doc, score };
  });
  
  // Return top 5 most relevant documents (increased from 3)
  return scoredDocs
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(doc => ({
      title: doc.title,
      content: doc.content,
      url: doc.url
    }));
}

function extractSiteName(url: string): string {
  try {
    const domain = new URL(url).hostname;
    // Remove common prefixes and get main site name
    const cleanDomain = domain.replace(/^(docs|api|developer|dev|support|help)\./, '');
    const parts = cleanDomain.split('.');
    // Get the main domain name (e.g., "firecrawl" from "firecrawl.dev")
    return parts[0] || 'Documentation';
  } catch {
    return 'Documentation';
  }
} 