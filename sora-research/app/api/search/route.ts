import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createHyperbrowserClient, getPlatformPricing, VideoComplexityFactors } from '@/lib/hyperbrowser';
import { getRunDir, readJSON, saveJSON, isValidRunId } from '@/lib/utils';
import { PricingResponse, PricingResult, RunData, ErrorResponse } from '@/lib/types';
import { getVideoDuration } from '@/lib/ffmpeg';

export async function POST(request: NextRequest): Promise<NextResponse<PricingResponse | ErrorResponse>> {
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

    // Get video duration
    let duration = runData.video_duration || 5;
    if (!runData.video_duration) {
      try {
        duration = await getVideoDuration(runData.video_path);
        runData.video_duration = duration;
        await saveJSON(dataPath, runData);
      } catch (error) {
        console.log('Could not get video duration, using default 5s');
      }
    }

    // Analyze audio complexity
    const hasAudio = !!runData.audio_path;
    const hasSpeech = runData.audio_transcription?.has_speech || false;

    // Analyze prompt for visual complexity
    const prompt = runData.prompt_result?.prompt || '';
    const styleTags = runData.prompt_result?.style_tags || [];
    
    // Determine style complexity from tags
    const complexStyleKeywords = ['cinematic', 'complex', 'detailed', 'intricate', 'elaborate', 'photorealistic', 'hyper-detailed'];
    const simpleStyleKeywords = ['minimal', 'simple', 'basic', 'clean', 'flat'];
    const hasComplexStyle = styleTags.some(tag => 
      complexStyleKeywords.some(keyword => tag.toLowerCase().includes(keyword))
    );
    const hasSimpleStyle = styleTags.some(tag => 
      simpleStyleKeywords.some(keyword => tag.toLowerCase().includes(keyword))
    );
    const styleComplexity: 'simple' | 'moderate' | 'complex' = 
      hasComplexStyle ? 'complex' : hasSimpleStyle ? 'simple' : 'moderate';

    // Analyze prompt for visual elements
    const promptLower = prompt.toLowerCase();
    
    // Check for camera movement
    const cameraKeywords = ['camera', 'pan', 'zoom', 'tracking', 'dolly', 'crane', 'moving', 'follows', 'fly', 'aerial'];
    const cameraMovement = cameraKeywords.some(keyword => promptLower.includes(keyword));
    
    // Check for multiple subjects
    const multipleSubjectKeywords = ['people', 'characters', 'crowd', 'group', 'multiple', 'several', 'many'];
    const multipleSubjects = multipleSubjectKeywords.some(keyword => promptLower.includes(keyword)) ||
      /\d+\s+(people|characters|subjects|persons)/i.test(prompt);
    
    // Check for detailed environment
    const environmentKeywords = ['environment', 'landscape', 'cityscape', 'interior', 'background', 'scene', 'setting', 'location'];
    const detailKeywords = ['detailed', 'intricate', 'complex', 'elaborate', 'rich', 'ornate'];
    const detailedEnvironment = 
      (environmentKeywords.some(k => promptLower.includes(k)) && detailKeywords.some(k => promptLower.includes(k))) ||
      promptLower.includes('detailed background') ||
      promptLower.includes('complex scene');
    
    // Determine overall visual complexity
    let visualComplexityScore = 0;
    if (cameraMovement) visualComplexityScore += 1;
    if (multipleSubjects) visualComplexityScore += 1;
    if (detailedEnvironment) visualComplexityScore += 1;
    if (hasComplexStyle) visualComplexityScore += 1;
    if (prompt.length > 200) visualComplexityScore += 1; // Long prompts usually mean complex videos
    
    const visualComplexity: 'simple' | 'moderate' | 'complex' = 
      visualComplexityScore >= 3 ? 'complex' : visualComplexityScore <= 1 ? 'simple' : 'moderate';

    // Build complexity factors object
    const factors: VideoComplexityFactors = {
      duration,
      hasAudio,
      hasSpeech,
      visualComplexity,
      cameraMovement,
      multipleSubjects,
      detailedEnvironment,
      styleComplexity,
    };

    console.log('Video complexity analysis:', {
      duration: `${duration}s`,
      hasAudio,
      hasSpeech,
      visualComplexity,
      styleComplexity,
      cameraMovement,
      multipleSubjects,
      detailedEnvironment,
    });

    const client = createHyperbrowserClient();
    const pricing = await getPlatformPricing(client, factors);

    const pricingResults: PricingResult[] = pricing.map(p => ({
      platform: p.platform,
      url: p.url,
      pricing_model: p.pricing_model,
      estimated_cost: p.estimated_cost,
      cost_per_second: p.cost_per_second,
      features: p.features,
      recommendation_score: p.recommendation_score,
    }));

    runData.pricing_results = pricingResults;
    await saveJSON(dataPath, runData);

    return NextResponse.json({ 
      run_id, 
      pricing: pricingResults,
      cheapest: pricingResults[0], // Already sorted by recommendation score
    });
  } catch (error) {
    console.error('Pricing search error:', error);
    return NextResponse.json(
      { error: 'Pricing search failed' },
      { status: 500 }
    );
  }
}
