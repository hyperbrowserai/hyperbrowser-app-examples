import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createReadStream } from 'fs';
import { getRunDir, readJSON, saveJSON, isValidRunId } from '@/lib/utils';
import { RunData, AudioTranscription, ErrorResponse } from '@/lib/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest): Promise<NextResponse<AudioTranscription | ErrorResponse>> {
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

    if (!runData.audio_path) {
      return NextResponse.json(
        { error: 'No audio found for this video' },
        { status: 400 }
      );
    }

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

    const audioTranscription: AudioTranscription = {
      text: transcription.text,
      has_speech: hasSpeech,
      has_music: hasMusic || !hasSpeech,
      duration: transcription.duration || 0,
    };

    runData.audio_transcription = audioTranscription;
    await saveJSON(dataPath, runData);

    return NextResponse.json(audioTranscription);
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}

