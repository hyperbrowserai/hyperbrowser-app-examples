import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import path from 'path';
import { extractKeyframes, extractAudio, hasAudioStream } from '@/lib/ffmpeg';
import { getRunDir, getRunPublicPath, saveJSON, ensureDir } from '@/lib/utils';
import { z } from 'zod';
import { UploadResponse, RunData, ErrorResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse | ErrorResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    const runId = uuidv4();
    const runDir = getRunDir(runId);
    const videoPath = path.join(runDir, 'video.mp4');

    // Basic type/size guards (50MB limit mirrored server-side)
    const contentType = file.type || '';
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 415 }
      );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 50MB)' },
        { status: 413 }
      );
    }
    const buffer = Buffer.from(bytes);

    await ensureDir(runDir);
    await writeFile(videoPath, buffer);

    // Extract frames: 1 per second, max 12 frames
    const frameFiles = await extractKeyframes(videoPath, runDir);
    const frames = frameFiles.map(f => `${getRunPublicPath(runId)}/${f}`);
    const videoUrl = `${getRunPublicPath(runId)}/video.mp4`;

    // Extract audio if present
    let audioPath: string | undefined;
    try {
      const hasAudio = await hasAudioStream(videoPath);
      if (hasAudio) {
        const audioFilePath = path.join(runDir, 'audio.mp3');
        await extractAudio(videoPath, audioFilePath);
        audioPath = audioFilePath;
      }
    } catch (error) {
      console.log('No audio stream found or extraction failed:', error);
    }

    const runData: RunData = {
      run_id: runId,
      video_path: videoPath,
      frames,
      audio_path: audioPath,
      created_at: new Date().toISOString(),
    };

    await saveJSON(path.join(runDir, 'data.json'), runData);

    return NextResponse.json({ run_id: runId, frames, video_url: videoUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
