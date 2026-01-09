import { NextRequest, NextResponse } from 'next/server';
import { searchImages } from '@/lib/unsplash';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const perPage = parseInt(searchParams.get('per_page') || '9');

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const images = await searchImages(query, perPage);

    const formattedImages = images.map((img) => ({
      id: img.id,
      url: img.urls.regular,
      thumb: img.urls.small,
      description: img.description || img.alt_description || '',
      author: img.user.name,
      authorUrl: img.user.links.html,
    }));

    return NextResponse.json({ images: formattedImages });
  } catch (error) {
    console.error('Unsplash search error:', error);
    return NextResponse.json(
      { error: 'Failed to search images' },
      { status: 500 }
    );
  }
}

