import { NextRequest, NextResponse } from 'next/server';

// Note: Pages are now stored in localStorage on the client side
// These API routes are kept for backwards compatibility

// GET - Fetch single page by slug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return NextResponse.json({ 
    error: 'Page not found',
    message: 'Pages are now stored in localStorage. Use getPageBySlug from lib/storage.ts'
  }, { status: 404 });
}

// PUT - Update page
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return NextResponse.json({ 
    message: 'Pages are now stored in localStorage. Use savePage from lib/storage.ts' 
  });
}

// DELETE - Delete page
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return NextResponse.json({ 
    message: 'Pages are now stored in localStorage. Use deletePage from lib/storage.ts' 
  });
}

