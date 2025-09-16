import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AnalyzeRequestSchema, AnalyzeResponseSchema, AnalysisInsightSchema } from '@/lib/types';
import { generateRunId, retryWithBackoff, determineTestStatus } from '@/lib/utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANALYSIS_PROMPT = `
You are a medical AI assistant analyzing blood test results. Based on the patient's test results and medical research provided, generate insights for each test.

For each blood test result, provide:
1. Status assessment (normal/high/low/critical)
2. Comparison with reference ranges
3. Plain-language explanation of what the result means
4. Potential health implications
5. General recommendations (not medical advice)

Be accurate, clear, and include relevant citations from the research provided.

Patient Results:
{results}

Medical Research:
{research}

Return ONLY valid JSON in this format:
{
  "insights": [
    {
      "test": "Test Name",
      "status": "normal|high|low|critical",
      "comparison": "Your value vs reference range explanation",
      "message": "Plain-language explanation of what this means",
      "sources": ["Source 1", "Source 2"],
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    }
  ],
  "summary": "Overall health summary based on all test results"
}
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = AnalyzeRequestSchema.parse(body);
    
    const runId = generateRunId();
    
    // Prepare data for analysis
    const resultsText = validatedRequest.results.map(test => 
      `${test.name}: ${test.value} ${test.unit} (Reference: ${test.refRange})`
    ).join('\n');
    
    const researchText = validatedRequest.research.map(article => 
      `Source: ${article.source}\nTitle: ${article.title}\nSummary: ${article.summary}\nLink: ${article.link}`
    ).join('\n\n');
    
    // Generate analysis using OpenAI
    const completion = await retryWithBackoff(async () => {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: 'You are a medical AI assistant that provides educational information about blood test results. Always include disclaimers that this is not medical advice and users should consult healthcare professionals.'
        },
        {
          role: 'user',
          content: ANALYSIS_PROMPT
            .replace('{results}', resultsText)
            .replace('{research}', researchText)
        }
      ];

      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.1,
        max_tokens: 3000,
      });
    });
    
    const analysisData = completion.choices[0]?.message?.content;
    if (!analysisData) {
      throw new Error('No analysis data received from OpenAI');
    }
    
    // Parse JSON response robustly (handle extra prose or code fences)
    let parsedAnalysis: {insights: Array<{test: string; status: string; comparison: string; message: string; sources?: string[]; recommendations?: string[]}>; summary: string};
    try {
      const raw = analysisData.trim();
      let jsonString = '';
      // Prefer ```json fenced blocks
      const fencedJsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/i) || raw.match(/```\s*([\s\S]*?)\s*```/);
      if (fencedJsonMatch && fencedJsonMatch[1]) {
        jsonString = fencedJsonMatch[1].trim();
      } else {
        // Fallback: first {...} block
        const objectMatch = raw.match(/\{[\s\S]*\}/);
        jsonString = objectMatch ? objectMatch[0] : raw;
      }

      parsedAnalysis = JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON parsing error in analyze:', error);
      console.error('OpenAI analyze raw content:', analysisData);
      return NextResponse.json(
        { error: 'Invalid JSON response from OpenAI analysis' },
        { status: 500 }
      );
    }
    
    // Validate insights
    const insights = parsedAnalysis.insights.map((insight) => {
      // Ensure status matches our determination
      const matchingTest = validatedRequest.results.find(test => test.name === insight.test);
      const actualStatus = matchingTest ? determineTestStatus(matchingTest.value, matchingTest.refRange) : insight.status;
      
      return AnalysisInsightSchema.parse({
        test: insight.test,
        status: actualStatus,
        comparison: insight.comparison,
        message: insight.message,
        sources: insight.sources || [],
        recommendations: insight.recommendations || [],
      });
    });
    
    // Add medical disclaimer to summary
    const summaryWithDisclaimer = `${parsedAnalysis.summary}

**Important Disclaimer:** This analysis is for educational purposes only and does not constitute medical advice. Always consult with qualified healthcare professionals for proper medical diagnosis and treatment recommendations.`;
    
    const response = AnalyzeResponseSchema.parse({
      insights,
      summary: summaryWithDisclaimer,
      runId,
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in analyze:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

