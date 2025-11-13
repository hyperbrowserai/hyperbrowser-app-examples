import { NextRequest, NextResponse } from 'next/server';
import { extractPageData, transformToGraphData } from '@/lib/hyperbrowser';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.HYPERBROWSER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'HYPERBROWSER_API_KEY not configured' },
        { status: 500 }
      );
    }

    const extractedData = await extractPageData(url, apiKey);
    const { graph, reasoning, nodeToReasoning } = transformToGraphData(extractedData);

    return NextResponse.json({
      success: true,
      url,
      graph,
      reasoning,
      metadata: extractedData.data,
      nodeToReasoning,
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze URL' },
      { status: 500 }
    );
  }
}

