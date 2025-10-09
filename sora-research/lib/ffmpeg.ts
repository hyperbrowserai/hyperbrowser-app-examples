import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

export async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`FFprobe error: ${err.message}`));
        return;
      }
      const duration = metadata.format.duration || 0;
      resolve(duration);
    });
  });
}

export async function hasAudioStream(videoPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`FFprobe error: ${err.message}`));
        return;
      }
      const hasAudio = metadata.streams.some(stream => stream.codec_type === 'audio');
      resolve(hasAudio);
    });
  });
}

export async function extractAudio(
  videoPath: string,
  outputPath: string
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const hasAudio = await hasAudioStream(videoPath);
      if (!hasAudio) {
        reject(new Error('Video has no audio stream'));
        return;
      }

      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(outputPath)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg audio extraction error: ${err.message}`));
        })
        .run();
    } catch (error) {
      reject(error);
    }
  });
}

export async function extractKeyframes(
  videoPath: string,
  outputDir: string,
  count?: number
): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get video duration
      const duration = await getVideoDuration(videoPath);
      
      // Calculate optimal frame count: 1 frame per second, max 24
      const optimalCount = count || Math.min(Math.ceil(duration), 24);
      const actualCount = Math.max(3, optimalCount); // Minimum 3 frames
      
      const frames: string[] = [];
      const outputPattern = path.join(outputDir, 'frame_%03d.jpg');
      
      // Calculate interval between frames
      const fps = duration > 0 ? actualCount / duration : 1;

      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=${fps},scale=1280:-1`,
          '-vsync vfr',
          '-frames:v', actualCount.toString(),
        ])
        .output(outputPattern)
        .on('end', () => {
          for (let i = 1; i <= actualCount; i++) {
            frames.push(`frame_${String(i).padStart(3, '0')}.jpg`);
          }
          resolve(frames);
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .run();
    } catch (error) {
      reject(error);
    }
  });
}