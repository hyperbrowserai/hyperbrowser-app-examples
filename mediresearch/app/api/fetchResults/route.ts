import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { extractTextFromPDF, validatePDFBuffer } from '@/lib/pdfProcessor';
import { FetchResultsRequestSchema, FetchResultsResponseSchema, BloodTestSchema, FetchResultsResponse } from '@/lib/types';
import type { BloodTest } from '@/lib/types';
import { generateRunId, saveEvidence, retryWithBackoff, determineTestStatus } from '@/lib/utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BLOOD_TEST_EXTRACTION_PROMPT = `
You are a medical data extraction specialist. Extract blood test results from the provided content.

The content may be:
1. Plain text from a medical report
2. Base64-encoded PDF content (marked with [PDF_BASE64_CONTENT]...[/PDF_BASE64_CONTENT])

If you receive base64 PDF content, please decode and extract the blood test information from it.

CRITICAL: You must respond with ONLY valid JSON, no other text before or after.

Instructions:
1. Extract ONLY actual blood test results with numerical values
2. Normalize test names to standard medical terminology  
3. Extract exact values, units, and reference ranges as shown
4. If no tests are found, return {"tests": []}

Required JSON format (respond with ONLY this JSON):
{
  "tests": [
    {
      "name": "Test Name",
      "value": "numerical_value", 
      "unit": "unit",
      "refRange": "reference_range"
    }
  ]
}

Content to analyze:
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = FetchResultsRequestSchema.parse(body);
    
    const runId = generateRunId();
    
    // Parse the uploaded file
    let extractedText = '';
    
    if (validatedRequest.fileType === 'pdf') {
      try {
        console.log('Starting PDF processing...');
        
        // Decode base64 PDF
        const pdfBuffer = Buffer.from(validatedRequest.file, 'base64');
        
        // Validate PDF
        if (!validatePDFBuffer(pdfBuffer)) {
          throw new Error('Invalid PDF file');
        }
        
        // Extract text using our comprehensive PDF processor
        const extractionResult = await extractTextFromPDF(pdfBuffer);
        
        if (!extractionResult.fullText.trim()) {
          throw new Error('Could not extract any text from the PDF');
        }
        
        extractedText = extractionResult.fullText;
        console.log(`Successfully extracted ${extractedText.length} characters from PDF`);
        console.log(`Processing details: ${extractionResult.pages.length} pages, ${extractionResult.processingTime}ms`);
        
      } catch (error) {
        console.error('PDF processing error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
          { 
            error: `PDF processing failed: ${message}. Please ensure the PDF is valid and contains readable content.` 
          },
          { status: 400 }
        );
      }
    } else if (validatedRequest.fileType === 'html') {
      // Decode base64 HTML and strip tags
      const htmlContent = Buffer.from(validatedRequest.file, 'base64').toString('utf-8');
      extractedText = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } else if (validatedRequest.fileType === 'txt') {
      // Decode base64 text file
      extractedText = Buffer.from(validatedRequest.file, 'base64').toString('utf-8');
    } else if (validatedRequest.fileType === 'csv') {
      // Decode base64 CSV
      extractedText = Buffer.from(validatedRequest.file, 'base64').toString('utf-8');
    }
    
    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from the uploaded file' },
        { status: 400 }
      );
    }
    
    // Extract blood test results using OpenAI
    const completion = await retryWithBackoff(async () => {
      // Now we have extracted text from the PDF, so we can just use it directly
      const messages: ChatCompletionMessageParam[] = [
        { role: 'user', content: BLOOD_TEST_EXTRACTION_PROMPT + extractedText },
      ];
      
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.1,
        max_tokens: 2000,
      });
    });
    
    const extractedData = completion.choices[0]?.message?.content;
    if (!extractedData) {
      throw new Error('No data extracted from OpenAI response');
    }
    
    // Parse JSON response
    let parsedData;
    try {
      // Clean the response in case there's extra text
      const cleanedResponse = extractedData.trim();
      
      // Try to find JSON within the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : cleanedResponse;
      
      parsedData = JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON parsing error:', error);
      console.error('OpenAI response:', extractedData);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }
    
    // Validate and normalize the extracted tests
    const tests = parsedData.tests.map((test: {name: string; value: string | number; unit: string; refRange: string}) => {
      const validatedTest = BloodTestSchema.parse({
        name: test.name,
        value: test.value,
        unit: test.unit,
        refRange: test.refRange,
        status: determineTestStatus(test.value, test.refRange),
      });
      return validatedTest;
    });
    
    // Create evidence markdown
    const evidenceMd = `# Blood Test Analysis - ${new Date().toISOString()}

## Original Report Text
\`\`\`
${extractedText.substring(0, 2000)}${extractedText.length > 2000 ? '...' : ''}
\`\`\`

## Extracted Tests
${tests.map((test: BloodTest) => `- **${test.name}**: ${test.value} ${test.unit} (Ref: ${test.refRange}) - Status: ${test.status}`).join('\n')}

## Processing Details
- Run ID: ${runId}
- File Type: ${validatedRequest.fileType}
- Tests Extracted: ${tests.length}
- Processing Date: ${new Date().toISOString()}
`;
    
    // Save evidence
    await saveEvidence(runId, evidenceMd);
    
    const response: FetchResultsResponse = {
      tests,
      evidence: {
        md: evidenceMd,
        sources: ['OpenAI GPT-4o', 'Original medical report'],
      },
      runId,
    };
    
    return NextResponse.json(FetchResultsResponseSchema.parse(response));
    
  } catch (error) {
    console.error('Error in fetchResults:', error);
    
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
