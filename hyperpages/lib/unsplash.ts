import { createApi } from 'unsplash-js';

// Debug: Check if API key exists
if (!process.env.UNSPLASH_ACCESS_KEY) {
  console.error('⚠️  UNSPLASH_ACCESS_KEY is not set in environment variables');
}

export const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY!,
});

export const searchImages = async (query: string, perPage: number = 9) => {
  try {
    console.log(`🔍 Searching Unsplash for: "${query}"`);
    
    // Add timeout wrapper - increased to 15 seconds
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Unsplash timeout')), 15000) // 15 second timeout
    );

    const searchPromise = unsplash.search.getPhotos({
      query,
      perPage,
      orientation: 'landscape',
    });

    const result = await Promise.race([searchPromise, timeoutPromise]);

    if (result.errors) {
      console.error('❌ Unsplash error:', result.errors);
      return [];
    }

    const images = result.response?.results || [];
    console.log(`✅ Found ${images.length} images for "${query}"`);
    return images;
  } catch (error) {
    console.error('❌ Unsplash search error:', error);
    return [];
  }
};

