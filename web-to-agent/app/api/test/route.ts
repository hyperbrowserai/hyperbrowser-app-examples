import { NextRequest, NextResponse } from 'next/server';
import { withRetry } from '@/lib/hyperbrowser';
import { TestRequestSchema, type ApiResponse, type TestResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, input, url } = TestRequestSchema.parse(body);

    const logs: string[] = [];
    
    const result = await withRetry(async () => {
        logs.push(`Creating session...`);
        // const session = await hyperbrowser.sessions.create({});

        try {
          logs.push(`Testing action for ${url}...`);
          // Skip navigation for now since API methods are limited
          await new Promise(resolve => setTimeout(resolve, 1000));
          logs.push(`Ready to test action`);

        let actionResult: Record<string, unknown> | null = null;

        // For now, simulate the action since we don't have full API access
        switch (action.type) {
          case 'click':
            logs.push(`Would click element: ${action.selector}`);
            actionResult = { clicked: true, simulated: true };
            break;

          case 'fill':
            // Look for value in different possible input properties
            const fillValue = input.value || input.query || input.text || Object.values(input)[0];
            if (!fillValue) {
              throw new Error('Value is required for fill action');
            }
            logs.push(`Would fill element ${action.selector} with: ${fillValue}`);
            actionResult = { filled: true, value: fillValue, simulated: true };
            break;

          case 'select':
            const selectValue = input.value || input.option || Object.values(input)[0];
            if (!selectValue) {
              throw new Error('Value is required for select action');
            }
            logs.push(`Would select option ${selectValue} in: ${action.selector}`);
            actionResult = { selected: true, value: selectValue, simulated: true };
            break;

          case 'extract':
            logs.push(`Would extract data from: ${action.selector}`);
            actionResult = { 
              extracted: true, 
              simulated: true,
              mockData: 'Sample extracted text'
            };
            break;

          case 'navigate':
            const navigateUrl = input.url || input.href || Object.values(input)[0];
            if (!navigateUrl) {
              throw new Error('URL is required for navigate action');
            }
            logs.push(`Would navigate to: ${navigateUrl}`);
            actionResult = { navigated: true, url: navigateUrl, simulated: true };
            break;

          default:
            throw new Error(`Unsupported action type: ${action.type}`);
        }

        logs.push(`Action completed successfully`);

        // Wait a moment for any changes to take effect
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Skip screenshots for now due to API limitations
        logs.push(`Skipping screenshot due to API limitations`);
        const screenshot = { base64: '' };

        return {
          success: true,
          result: actionResult,
          screenshot: screenshot.base64,
          logs,
        };

      } finally {
        logs.push(`Cleaning up session...`);
        // Skip session cleanup for now due to API limitations
      }
    });

    const response: ApiResponse<TestResult> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Test error:', error);
    
    const response: ApiResponse<TestResult> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test action',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
