import { NextRequest, NextResponse } from 'next/server';
import { generateOutline, generateSectionContent } from '@/lib/openai';
import { searchImages } from '@/lib/unsplash';
import { generateImageQuery } from '@/lib/image-query';

export async function POST(req: NextRequest) {
  try {
    const { topic, audience } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Step 1: Generate outline (skip slow Hyperbrowser research for speed)
    // Use GPT's general knowledge instead
    const research = `Generate content about ${topic} using your knowledge.`;
    
    console.log(`📝 Generating outline for: ${topic}`);
    const sectionTitles = await generateOutline(topic, audience, research);
    console.log(`✅ Generated ${sectionTitles.length} section titles`);

    // Fetch hero image in background (non-blocking)
    const heroImagePromise = (async () => {
      try {
        const heroQuery = await generateImageQuery(topic, 'Hero Image');
        console.log(`Searching hero image with query: ${heroQuery}`);
        const images = await searchImages(heroQuery, 1);
        console.log(`Found ${images.length} hero images`);
        return images && images.length > 0 ? images[0].urls.regular : '';
      } catch (error) {
        console.error('Error fetching hero image:', error);
        return '';
      }
    })();

    // Step 2: Generate section outlines first (fast response)
    const sectionOutlines = sectionTitles.map((title, index) => ({
      id: `section-${Date.now()}-${index}`,
      title,
      content: '',
      image: undefined,
    }));

    // Step 3: Generate content and fetch images with timeout
    const usedImageUrls = new Set<string>();
    
    const sections = await Promise.all(
      sectionOutlines.map(async (outline) => {
        // Generate content first
        console.log(`📝 Generating content for: ${outline.title}`);
        const contentStream = await generateSectionContent(topic, outline.title, audience, research);
        
        // Collect content from stream
        let content = '';
        for await (const chunk of contentStream) {
          const text = chunk.choices[0]?.delta?.content || '';
          content += text;
        }

        // Fetch image with timeout (don't block if it fails)
        let imageUrl = '';
        try {
          const imageQueryPromise = generateImageQuery(topic, outline.title);
          const imageQuery = await Promise.race([
            imageQueryPromise,
            new Promise<string>(resolve => setTimeout(() => resolve(''), 5000))
          ]) as string;
          
          if (imageQuery) {
            const imagesPromise = searchImages(imageQuery, 5);
            const images = await Promise.race([
              imagesPromise,
              new Promise<Awaited<typeof imagesPromise>>(resolve => setTimeout(() => resolve([]), 12000))
            ]);
            
            console.log(`Fetched ${images.length} images for section: ${outline.title}`);
            
            // Find first image not already used
            for (const img of images) {
              if (!usedImageUrls.has(img.urls.regular)) {
                imageUrl = img.urls.regular;
                usedImageUrls.add(imageUrl);
                break;
              }
            }
            
            // If all used, fall back to first one
            if (!imageUrl && images.length > 0) {
              imageUrl = images[0].urls.regular;
            }
          }
        } catch (error) {
          // Silently fail - images are optional
          console.error('Error fetching image for section:', error);
        }

        return {
          ...outline,
          content: content.trim(),
          image: imageUrl || undefined,
        };
      })
    );

    // Wait for hero image (with timeout)
    const heroImage = await Promise.race([
      heroImagePromise,
      new Promise<string>(resolve => setTimeout(() => resolve(''), 12000))
    ]);
    
    console.log(`Hero image URL: ${heroImage || 'none'}`);

    return NextResponse.json({ sections, heroImage, outlines: sectionOutlines });
  } catch (error) {
    console.error('Generate API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

