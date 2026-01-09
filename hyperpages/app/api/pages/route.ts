import { NextRequest, NextResponse } from 'next/server';

// Note: Pages are now stored in localStorage on the client side
// These API routes are kept for backwards compatibility but return empty results

// GET - List all pages
export async function GET() {
  return NextResponse.json({ pages: [] });
}

// POST - Create new page
export async function POST(req: NextRequest) {
  // Pages are saved client-side via localStorage
  // This endpoint is kept for compatibility
  return NextResponse.json({ 
    message: 'Pages are now stored in localStorage. Use the storage utilities in lib/storage.ts' 
  });
}

