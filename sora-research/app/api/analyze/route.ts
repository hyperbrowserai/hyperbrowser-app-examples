import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getRunDir, readJSON, saveJSON, isValidRunId } from '@/lib/utils';
import { RunData, ErrorResponse, AnalysisResponse } from '@/lib/types';
import { readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import OpenAI from 'openai';
// Removed unused ai-sdk imports

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisResponse | ErrorResponse>> {
  try {
    const { run_id, frames } = await request.json();
    if (!isValidRunId(run_id) || !frames || !Array.isArray(frames)) {
      return NextResponse.json(
        { error: 'run_id and frames are required' },
        { status: 400 }
      );
    }

    const runDir = getRunDir(run_id);
    const dataPath = path.join(runDir, 'data.json');
    const runData = await readJSON<RunData>(dataPath);

    console.log('Starting analysis with existing data:', {
      has_audio_path: !!runData.audio_path,
      has_audio_transcription: !!runData.audio_transcription,
      has_prompt_result: !!runData.prompt_result,
      has_pricing_results: !!runData.pricing_results,
    });

    const result: AnalysisResponse = {
      run_id,
      has_audio: !!runData.audio_path,
      audio_transcription: runData.audio_transcription || null,
      prompt_result: runData.prompt_result || null,
      pricing_results: runData.pricing_results || null,
      summary: runData.summary || null,
    };

    // Step 1: Transcribe audio if available
    if (runData.audio_path && !runData.audio_transcription) {
      try {
        const fileStream = createReadStream(runData.audio_path);

        const transcription = await openai.audio.transcriptions.create({
          file: fileStream,
          model: 'whisper-1',
          response_format: 'verbose_json',
        });

        const hasSpeech = transcription.text.length > 10;
        const hasMusic = transcription.text.length === 0 || 
                         transcription.text.toLowerCase().includes('[music]') ||
                         transcription.text.toLowerCase().includes('[instrumental]');

        runData.audio_transcription = {
          text: transcription.text,
          has_speech: hasSpeech,
          has_music: hasMusic || !hasSpeech,
          duration: transcription.duration || 0,
        };

        result.audio_transcription = runData.audio_transcription;
        await saveJSON(dataPath, runData);
      } catch (error) {
        console.log('Audio transcription failed, continuing without it:', error);
      }
    } else if (runData.audio_transcription) {
      result.audio_transcription = runData.audio_transcription;
    }

    // Step 2: Generate prompt with audio context (only if not already done)
    if (!result.prompt_result) {
      try {
        const imageContents = await Promise.all(
        frames.map(async (framePath: string) => {
          const fileName = path.basename(framePath);
          const filePath = path.join(runDir, fileName);
          const imageBuffer = await readFile(filePath);
          const base64 = imageBuffer.toString('base64');
          return `data:image/jpeg;base64,${base64}`;
        })
      );

      const audioContext = result.audio_transcription
        ? result.audio_transcription.has_speech
          ? `\n\nAUDIO CONTEXT:\nThe video contains spoken dialogue: "${result.audio_transcription.text}"\nIncorporate this dialogue/narration into your understanding of the video's intent.`
          : result.audio_transcription.has_music
          ? `\n\nAUDIO CONTEXT:\nThe video contains background music or sound effects (no spoken dialogue).`
          : ''
        : '';

      const systemPrompt = `You are analyzing keyframes from an AI-generated video (1 frame per second). Infer the DETAILED text prompt that was used to generate this video.

Consider:
- Visual style and aesthetics
- Camera movements and angles
- Scene composition and lighting
- Subject matter and actions
- Mood and atmosphere
- Any text or objects visible${audioContext}

Return ONLY valid JSON with this exact structure:
{
  "prompt": "detailed, specific generation prompt describing all key visual elements, style, and actions",
  "style_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "confidence": 0.85,
  "audio_context": "brief description of how audio enhances the video (if applicable)"
}

Be detailed and specific. The prompt should capture the essence of what's shown across all frames.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze these keyframes from an AI-generated video.' },
              ...imageContents.map((dataUrl: string) => ({
                type: 'image_url' as const,
                image_url: { url: dataUrl },
              })),
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      
      const promptResult = JSON.parse(cleanedText);
      runData.prompt_result = promptResult;
      result.prompt_result = promptResult;
      await saveJSON(dataPath, runData);
      } catch (error) {
        console.error('Prompt inference failed:', error);
      }
    } else {
      console.log('Prompt already exists, skipping generation');
    }

    // Step 3: Get platform pricing (only if not already done)
    if (!result.pricing_results) {
      try {
        const pricingResponse = await fetch(`${request.nextUrl.origin}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ run_id }),
        });

        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          result.pricing_results = pricingData.pricing;
        }
      } catch (error) {
        console.error('Pricing search failed:', error);
      }
    } else {
      console.log('Pricing already exists, skipping fetch');
    }

    // Step 4: Generate summary
    try {
      const prompt = result.prompt_result;
      const pricing = result.pricing_results;

      let summary = '';
      
      if (prompt && pricing && pricing.length > 0) {
        const cheapest = pricing[0];
        summary = `This video can be recreated for approximately ${cheapest.estimated_cost} using ${cheapest.platform}. The inferred generation prompt is: "${prompt.prompt}". Style characteristics include ${prompt.style_tags.join(', ')} with ${Math.round(prompt.confidence * 100)}% confidence.`;
      } else if (prompt) {
        summary = `Inferred generation prompt: "${prompt.prompt}". Style: ${prompt.style_tags.join(', ')}.`;
      } else {
        summary = 'Analysis in progress.';
      }

      const updatedRunData = await readJSON<RunData>(dataPath);
      updatedRunData.summary = summary;
      await saveJSON(dataPath, updatedRunData);
      result.summary = summary;
    } catch (error) {
      console.error('Summary generation failed:', error);
      result.summary = 'Analysis completed.';
    }

    console.log('Analysis complete, returning:', {
      has_audio: result.has_audio,
      has_transcription: !!result.audio_transcription,
      has_prompt: !!result.prompt_result,
      has_pricing: !!result.pricing_results,
      has_summary: !!result.summary
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

