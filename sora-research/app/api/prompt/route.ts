import { NextRequest } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import path from 'path';
import { readFile } from 'fs/promises';
import { getRunDir, readJSON, saveJSON, isValidRunId } from '@/lib/utils';
import { z } from 'zod';
import { RunData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { run_id, frames } = await request.json();
    if (!isValidRunId(run_id) || !frames || !Array.isArray(frames)) {
      return new Response(
        JSON.stringify({ error: 'run_id and frames are required' }),
        { status: 400 }
      );
    }

    if (!run_id || !frames || !Array.isArray(frames)) {
      return new Response(
        JSON.stringify({ error: 'run_id and frames are required' }),
        { status: 400 }
      );
    }

    const runDir = getRunDir(run_id);
    const dataPath = path.join(runDir, 'data.json');
    const runData = await readJSON<RunData>(dataPath);

    // Check if audio exists and trigger transcription if available
    if (runData.audio_path && !runData.audio_transcription) {
      try {
        const transcribeResponse = await fetch(`${request.nextUrl.origin}/api/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ run_id }),
        });
        if (transcribeResponse.ok) {
          const transcription = await transcribeResponse.json();
          runData.audio_transcription = transcription;
        }
      } catch (error) {
        console.log('Audio transcription failed, continuing without it:', error);
      }
    }

    // Convert local file paths to base64 data URLs (use all frames, max 12)
    const imageContents = await Promise.all(
      frames.map(async (framePath: string) => {
        const fileName = path.basename(framePath);
        const filePath = path.join(runDir, fileName);
        const imageBuffer = await readFile(filePath);
        const base64 = imageBuffer.toString('base64');
        return `data:image/jpeg;base64,${base64}`;
      })
    );

    const audioContext = runData.audio_transcription
      ? runData.audio_transcription.has_speech
        ? `\n\nAUDIO CONTEXT:\nThe video contains spoken dialogue: "${runData.audio_transcription.text}"\nIncorporate this dialogue/narration into your understanding of the video's intent.`
        : runData.audio_transcription.has_music
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

    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze these keyframes from an AI-generated video.' },
            ...imageContents.map((dataUrl: string) => ({
              type: 'image' as const,
              image: dataUrl,
            })),
          ],
        },
      ],
      temperature: 0.3,
      maxOutputTokens: 800,
      onFinish: async ({ text }) => {
        try {
          // Strip markdown code blocks if present
          let cleanedText = text.trim();
          if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }
          const PromptSchema = z.object({
            prompt: z.string(),
            style_tags: z.array(z.string()).min(1),
            confidence: z.number().min(0).max(1),
            audio_context: z.string().optional()
          });
          const parsedJson = JSON.parse(cleanedText);
          const parsedRes = PromptSchema.safeParse(parsedJson);
          if (!parsedRes.success) {
            throw new Error('Invalid JSON schema from model');
          }
          const parsed = parsedRes.data;
          runData.prompt_result = parsed;
          await saveJSON(dataPath, runData);
        } catch (error) {
          console.error('Failed to parse prompt result:', error, 'Raw text:', text);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Prompt inference error:', error);
    return new Response(
      JSON.stringify({ error: 'Prompt inference failed' }),
      { status: 500 }
    );
  }
}