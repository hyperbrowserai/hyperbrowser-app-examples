import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getRunDir, readJSON, saveJSON, isValidRunId } from '@/lib/utils';
import { SummaryResponse, RunData, ErrorResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<SummaryResponse | ErrorResponse>> {
  try {
    const { run_id } = await request.json();
    if (!isValidRunId(run_id)) {
      return NextResponse.json(
        { error: 'Invalid run_id' },
        { status: 400 }
      );
    }

    if (!run_id) {
      return NextResponse.json(
        { error: 'run_id is required' },
        { status: 400 }
      );
    }

    const runDir = getRunDir(run_id);
    const dataPath = path.join(runDir, 'data.json');
    const runData = await readJSON<RunData>(dataPath);

    const source = runData.search_results?.[0];
    const prompt = runData.prompt_result;

    let summary = '';
    
    if (source && prompt) {
      summary = `This Sora-generated video was first detected at ${source.url}. The inferred generation prompt is: "${prompt.prompt}". Style characteristics include ${prompt.style_tags.join(', ')} with ${Math.round(prompt.confidence * 100)}% confidence.`;
    } else if (prompt) {
      summary = `Inferred generation prompt: "${prompt.prompt}". Style: ${prompt.style_tags.join(', ')}.`;
    } else if (source) {
      summary = `Video detected at ${source.url}. Prompt analysis pending.`;
    } else {
      summary = 'Analysis in progress.';
    }

    runData.summary = summary;
    await saveJSON(dataPath, runData);

    return NextResponse.json({ summary, source, prompt });
  } catch (error) {
    console.error('Summary error:', error);
    return NextResponse.json(
      { error: 'Summary generation failed' },
      { status: 500 }
    );
  }
}
