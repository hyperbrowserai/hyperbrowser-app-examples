# Sora Video Analyzer

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

Upload an AI-generated video to discover similar content across the web and infer the text prompt that created it. Powered by Hyperbrowser visual search, AI gallery scraping, and GPT-4o prompt analysis.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Hyperbrowser Integration](#hyperbrowser-integration)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [Performance](#performance)
- [Growth Use Case](#growth-use-case)

## Features

- **Audio Detection & Transcription**: Automatically extract and transcribe audio using OpenAI Whisper
- **Audio-Enhanced Prompts**: Refine prompt inference by incorporating speech and audio context
- **Find Similar Videos**: Discover visually similar AI-generated content using Google Lens reverse image search
- **AI Gallery Search**: Search across Runway, Pika, and Civitai video galleries for related content
- **Community Discovery**: Find discussions on Reddit about similar AI videos
- **Prompt Decoding**: Analyze keyframes to infer the generation prompt with confidence scores
- **Keyframe Extraction**: Automatically extract representative frames from uploaded videos
- **Stateless Storage**: File-based runs stored under `/public/runs/<uuid>/`

## Tech Stack

- Next.js 15 App Router
- TypeScript (strict mode)
- Tailwind CSS
- Hyperbrowser API (Sessions, Extract, Scrape)
- OpenAI GPT-4o & Whisper
- FFmpeg

## Quick Start

### 1. Install FFmpeg

```bash
# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg

# Verify
ffmpeg -version
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Keys

Create `.env.local`:

```bash
HYPERBROWSER_API_KEY=hb_xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

**Get your API keys:**
- Hyperbrowser: https://hyperbrowser.ai
- OpenAI: https://platform.openai.com/api-keys

### 4. Run

```bash
npm run dev
```

Visit http://localhost:3000

## Detailed Setup

### Prerequisites

1. Node.js 18+ installed
2. FFmpeg installed on your system
3. API keys ready

### Step-by-Step Setup

#### 1. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH

Verify installation:
```bash
ffmpeg -version
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
HYPERBROWSER_API_KEY=hb_xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

#### 4. Create Required Directories

```bash
mkdir -p public/runs
```

#### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

### Verification

Test that everything works:

1. Upload a sample video (any MP4 file)
2. Check that keyframes are extracted
3. Try "Find Similar Videos"
4. Try "Prompt Decoder"

## Usage

### UI Workflow

1. **Upload an AI video** - The app automatically:
   - Extracts 5 keyframes (1 per second)
   - Detects and extracts audio track if present
2. **Transcribe Audio** (if available) - Uses OpenAI Whisper to:
   - Transcribe spoken dialogue
   - Detect music/sound effects
   - Analyze audio context
3. **Find Similar Videos** - Uses Hyperbrowser to search:
   - Google Lens reverse image search for visual matches
   - AI video galleries (Runway, Pika, Civitai)
   - Reddit AI communities for discussions
4. **Decode Prompt** - Analyzes frames with GPT-4o to infer generation prompt
   - Automatically incorporates audio context if available
   - Refines prompt based on dialogue/music
5. **Generate Summary** - Combines findings into a shareable report

### File Structure

All runs are stored stateless in `/public/runs/<run_id>/`:

```
/public/runs/<run_id>/
  ├── video.mp4           # Original uploaded video
  ├── audio.mp3           # Extracted audio (if present)
  ├── frame_001.jpg       # Keyframe 1
  ├── frame_002.jpg       # Keyframe 2
  ├── frame_003.jpg       # Keyframe 3
  ├── frame_004.jpg       # Keyframe 4
  ├── frame_005.jpg       # Keyframe 5
  ├── data.json           # Complete run data (includes audio transcription)
  └── results.json        # Search results
```

## API Endpoints

### POST /api/upload
Upload a video and extract keyframes

```typescript
const formData = new FormData();
formData.append('video', file);
const res = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
const { run_id, frames } = await res.json();
// Returns: { run_id: string, frames: string[] }
```

### POST /api/search
Find similar videos using Hyperbrowser

```typescript
const res = await fetch('/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    run_id, 
    frame_url: 'http://localhost:3000/runs/abc/frame_001.jpg'
  }),
});
const { results } = await res.json();
// Returns: { run_id: string, results: SearchResult[] }
```

### POST /api/transcribe
Transcribe audio from video using OpenAI Whisper

```typescript
const res = await fetch('/api/transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ run_id }),
});
const { text, has_speech, has_music, duration } = await res.json();
// Returns: { text: string, has_speech: boolean, has_music: boolean, duration: number }
```

### POST /api/prompt
Infer generation prompt from frames (automatically includes audio context if available)

```typescript
const res = await fetch('/api/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    run_id, 
    frames: frames.map(f => `${window.location.origin}${f}`)
  }),
});
const { prompt, style_tags, confidence, audio_context } = await res.json();
// Returns: { prompt: string, style_tags: string[], confidence: number, audio_context?: string }
```

### POST /api/summarize
Generate a combined summary

```typescript
const res = await fetch('/api/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ run_id }),
});
const { summary } = await res.json();
// Returns: { summary: string, source?: SearchResult, prompt?: PromptResult }
```

## Hyperbrowser Integration

This app uses **official Hyperbrowser APIs**:

### Sessions API
```typescript
// Start cloud browser session
const session = await hyperbrowser.startSession();
await hyperbrowser.navigate(session.sessionId, url);
const screenshot = await hyperbrowser.screenshot(session.sessionId);
await hyperbrowser.closeSession(session.sessionId);
```

### Extract API
```typescript
// Extract structured data with schema
const schema = {
  videos: [{
    title: 'string',
    author: 'string',
    url: 'string',
  }],
};
const data = await hyperbrowser.extract(url, schema);
```

### Scrape API
```typescript
// Scrape page content
const result = await hyperbrowser.scrape(url);
// Returns: { content: string, title: string, url: string }
```

## How It Works

### 1. Find Similar Videos

**Google Lens Search:**
- Takes first keyframe from uploaded video
- Uses Google Lens reverse image search
- Extracts visually similar results

**AI Gallery Search:**
- Scrapes Runway showcase page
- Scrapes Pika community gallery
- Scrapes Civitai video section
- Extracts video metadata (title, author, thumbnail)

**Reddit Community Search:**
- Searches r/singularity and r/StableDiffusion
- Finds top posts about AI video generation
- Extracts discussion metadata

### 2. Audio Transcription (New!)

**Audio Detection:**
- Automatically checks if video has audio track
- Extracts audio as MP3 using FFmpeg

**Whisper Transcription:**
- Uses OpenAI Whisper API for accurate transcription
- Detects spoken dialogue vs music/sound effects
- Returns text, audio type, and duration

### 3. Prompt Decoder

- Sends 3 keyframes to GPT-4o
- Automatically includes audio context if available
- Incorporates dialogue/narration into prompt analysis
- Uses low temperature (0.2) for consistency
- Returns: prompt, style tags, confidence score, audio context
- Optimized for minimal token usage

### 4. Data Flow

```
1. User uploads video
   ↓
2. /api/upload
   - Save to /public/runs/<id>
   - Extract 5 keyframes with FFmpeg
   - Extract audio if present (MP3)
   - Return frames
   ↓
3a. /api/transcribe (if audio exists)
    - Send audio to OpenAI Whisper
    - Detect speech vs music
    - Save transcription to data.json
    ↓
3b. /api/search (Find Similar Videos)
    - Use Hyperbrowser sessions
    - Google Lens + AI galleries + Reddit
    - Save results to data.json
    ↓
3c. /api/prompt (Prompt Decoder)
    - Auto-transcribe audio if not done
    - Send frames + audio context to GPT-4o
    - Parse JSON response with audio context
    - Save to data.json
    ↓
4. /api/summarize
   - Read data.json
   - Combine source + prompt + audio
   - Generate comprehensive summary
```

## Project Structure

```
sora-research/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── upload/route.ts       # Video upload + keyframe + audio extraction
│   │   ├── transcribe/route.ts   # OpenAI Whisper audio transcription
│   │   ├── search/route.ts       # Hyperbrowser similarity search
│   │   ├── prompt/route.ts       # GPT-4o prompt inference (audio-enhanced)
│   │   └── summarize/route.ts    # Combined report generation
│   ├── page.tsx                  # Main UI component
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── lib/                          # Core utilities
│   ├── types.ts                  # TypeScript interfaces
│   ├── hyperbrowser.ts           # Hyperbrowser client (official APIs)
│   ├── ffmpeg.ts                 # FFmpeg keyframe extraction
│   └── utils.ts                  # File system utilities
├── public/
│   └── runs/                     # Stateless run storage
│       └── <run_id>/             # Per-run directory
│           ├── video.mp4         # Uploaded video
│           ├── frame_*.jpg       # Keyframes
│           ├── data.json         # Run metadata
│           └── results.json      # Search results
└── [config files]                # TypeScript, ESLint, Tailwind, Next.js
```

### API Routes

| Route | Purpose | Input | Output |
|-------|---------|-------|--------|
| `/api/upload` | Upload video & extract frames + audio | `FormData` with video | `{run_id, frames}` |
| `/api/transcribe` | Transcribe audio with Whisper | `{run_id}` | `{text, has_speech, has_music, duration}` |
| `/api/search` | Search with Hyperbrowser | `{run_id, frame_url?}` | `{run_id, results}` |
| `/api/prompt` | Infer prompt with GPT-4o + audio | `{run_id, frames}` | `{prompt, style_tags, confidence, audio_context?}` |
| `/api/summarize` | Generate summary | `{run_id}` | `{summary, source?, prompt?}` |

### Core Libraries

**lib/hyperbrowser.ts**
- Hyperbrowser API client
- Session management
- Retry logic with exponential backoff
- Extract & Scrape methods

**lib/ffmpeg.ts**
- FFmpeg wrapper for Node.js
- Keyframe extraction (5 frames default)
- Audio extraction to MP3
- Audio stream detection
- 1280px width scaling
- JPEG output

**lib/utils.ts**
- File system helpers
- JSON read/write
- Directory creation
- Path management

**lib/types.ts**
- TypeScript interfaces
- API request/response types
- Run data structures

## Troubleshooting

### FFmpeg not found
- Ensure FFmpeg is in your system PATH
- Restart your terminal after installation
- Verify with `ffmpeg -version`

### API errors
- Verify your API keys are correct in `.env.local`
- Check your API quotas and billing
- Check console for detailed error messages

### Upload fails
- Check file size limits (50MB max)
- Ensure the video format is supported by FFmpeg
- Check browser console for errors

### File permissions
```bash
chmod -R 755 public/runs
```

### Build errors
```bash
# Clean build
rm -rf .next
npm run build
```

## Deployment

### Production on Vercel

1. Add environment variables in Vercel dashboard:
   - `HYPERBROWSER_API_KEY`
   - `OPENAI_API_KEY`

2. Ensure FFmpeg is available (use `ffmpeg-static` package if needed)

3. Consider external storage for `/public/runs` (S3, Cloudflare R2, etc.)

4. Update `next.config.ts` for production optimizations

### Environment Variables

Production `.env.local`:
```bash
HYPERBROWSER_API_KEY=hb_xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

## Performance

- **Video upload**: 50MB limit
- **Keyframes**: 5 per video (optimal for LLM analysis)
- **Hyperbrowser**: Retry logic with exponential backoff (3 attempts)
- **GPT-4o**: 500 max tokens per request
- **Temperature**: 0.2 (consistent results)
- **Results**: Top 10 similar videos returned
- **Storage**: File-based, no database overhead

### Optimization Tips

- Limit keyframe extraction to 5 frames max
- Use low-resolution thumbnails for previews
- Implement pagination for search results
- Cache analysis results in `/public/runs`
- Results are cached - no database needed

## Growth Use Case

Perfect for:
- **AI artists** finding inspiration and similar styles
- **Researchers** tracking AI video trends
- **Content creators** discovering related work
- **Developers** analyzing video generation patterns
- **Community managers** curating AI art collections
- **Educators** studying AI generation techniques

## Architecture

- **Stateless**: No database - all runs stored as JSON files
- **Low Credit Use**: Optimized API calls with retry logic
- **Type-Safe**: Strict TypeScript throughout
- **Modular**: Clean separation of concerns
- **Scalable**: File-based storage, easy to move to S3/R2

## Follow

Follow [@hyperbrowser](https://twitter.com/hyperbrowser) for updates.