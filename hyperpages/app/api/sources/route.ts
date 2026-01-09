import { NextRequest, NextResponse } from 'next/server';
import { fetchSources } from '@/lib/hyperbrowser';

export async function GET(req: NextRequest) {
  try {
    const topic = req.nextUrl.searchParams.get('topic');

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const sources = await fetchSources(topic);

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Sources API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

