'use client';

import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
import Image from 'next/image';
import { UploadResponse, PricingResponse, PricingResult, PromptResult, SummaryResponse, AudioTranscription, AnalysisResponse } from '@/lib/types';

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [runId, setRunId] = useState<string>('');
  const [frames, setFrames] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [hasAudio, setHasAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTranscription, setAudioTranscription] = useState<AudioTranscription | null>(null);
  const [pricingResults, setPricingResults] = useState<PricingResult[] | null>(null);
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState({ pricing: false, prompt: false, summary: false, transcribe: false });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data: UploadResponse = await res.json();
      setRunId(data.run_id);
      setFrames(data.frames);
      if (data.video_url) {
        setVideoUrl(data.video_url);
      }

      // Check if video has audio
      const dataRes = await fetch(`/runs/${data.run_id}/data.json`);
      if (dataRes.ok) {
        const runData = await dataRes.json();
        setHasAudio(!!runData.audio_path);
        if (runData.audio_path) {
          setAudioUrl(`/runs/${data.run_id}/audio.mp3`);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  // Ensure audio URL is set when we know the run has audio
  useEffect(() => {
    if (runId && hasAudio) {
      setAudioUrl(`/runs/${runId}/audio.mp3`);
    }
  }, [runId, hasAudio]);

  function Waveform({ src }: { src: string }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      let isCancelled = false;
      const draw = async () => {
        try {
          const res = await fetch(src);
          const arrayBuffer = await res.arrayBuffer();
          const AudioCtx: typeof AudioContext = window.AudioContext || window.webkitAudioContext!;
          const audioCtx = new AudioCtx();
          const audioBuffer: AudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          if (isCancelled) { audioCtx.close(); return; }

          const canvas = canvasRef.current;
          if (!canvas) { audioCtx.close(); return; }
          const width = canvas.clientWidth || 600;
          const height = canvas.clientHeight || 48;
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(width * dpr);
          canvas.height = Math.floor(height * dpr);
          const ctx = canvas.getContext('2d');
          if (!ctx) { audioCtx.close(); return; }
          ctx.resetTransform();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(0, 0, width, height);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;

          const channelData = audioBuffer.getChannelData(0);
          const samples = Math.max(1, Math.min(width, 2000));
          const blockSize = Math.max(1, Math.floor(channelData.length / samples));

          ctx.beginPath();
          for (let i = 0; i < samples; i++) {
            const start = i * blockSize;
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < blockSize; j++) {
              const val = channelData[start + j] || 0;
              if (val < min) min = val;
              if (val > max) max = val;
            }
            const x = (i / samples) * width;
            const yTop = (1 - max) * 0.5 * height;
            const yBot = (1 - min) * 0.5 * height;
            ctx.moveTo(x, yTop);
            ctx.lineTo(x, yBot);
          }
          ctx.stroke();
          audioCtx.close();
        } catch {
          // ignore waveform errors silently
        }
      };
      draw();
      return () => { isCancelled = true; };
    }, [src]);

    return (
      <canvas ref={canvasRef} className="w-full h-12 border border-gray-300" />
    );
  }

  const handleCompleteAnalysis = async () => {
    if (!runId || frames.length === 0) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId, frames }),
      });

      if (!res.ok) {
        throw new Error('Analysis failed');
      }

      const data: AnalysisResponse = await res.json();
      
      // Check if we got results
      if (!data.prompt_result && !data.audio_transcription) {
        setError('OpenAI API quota exceeded. Please add credits at platform.openai.com/settings/organization/billing');
      }
      
      if (data.audio_transcription) {
        setAudioTranscription(data.audio_transcription);
      }
      
      if (data.prompt_result) {
        setPromptResult(data.prompt_result);
      }
      
      if (data.pricing_results) {
        setPricingResults(data.pricing_results);
      }
      
      if (data.summary) {
        setSummary({ 
          summary: data.summary,
          prompt: data.prompt_result || undefined,
        });
      }
    } catch (error) {
      console.error('Complete analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTranscribe = async () => {
    if (!runId) return;
    setLoading(prev => ({ ...prev, transcribe: true }));

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      });
      const data: AudioTranscription = await res.json();
      setAudioTranscription(data);
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      setLoading(prev => ({ ...prev, transcribe: false }));
    }
  };

  const handlePricingSearch = async () => {
    if (!runId) return;
    setLoading(prev => ({ ...prev, pricing: true }));

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      });
      const data: PricingResponse = await res.json();
      setPricingResults(data.pricing);
    } catch (error) {
      console.error('Pricing search failed:', error);
    } finally {
      setLoading(prev => ({ ...prev, pricing: false }));
    }
  };

  const handlePromptInference = async () => {
    if (!runId || frames.length === 0) return;
    setLoading(prev => ({ ...prev, prompt: true }));

    try {
      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId, frames }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Stream failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });

        try {
          let cleanedText = accumulated.trim();
          if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }
          const parsed = JSON.parse(cleanedText);
          setPromptResult(parsed);
        } catch {
          // Not complete JSON yet, continue reading
        }
      }

      // Final parse - strip markdown if present
      try {
        let cleanedText = accumulated.trim();
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(cleanedText);
        setPromptResult(parsed);
      } catch (error) {
        console.error('Failed to parse final result:', error);
      }
    } catch (error) {
      console.error('Prompt inference failed:', error);
    } finally {
      setLoading(prev => ({ ...prev, prompt: false }));
    }
  };

  const handleSummarize = async () => {
    if (!runId) return;
    setLoading(prev => ({ ...prev, summary: true }));

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      });
      const data: SummaryResponse = await res.json();
      setSummary(data);
    } catch (error) {
      console.error('Summary failed:', error);
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-black px-8 py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sora Video Analyzer</h1>
          <p className="text-sm text-gray-600">
            Built with <a href="https://hyperbrowser.ai" target="_blank" rel="noopener noreferrer" className="underline">Hyperbrowser</a>
          </p>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-65px)]">
        {/* Left Sidebar - Upload */}
        <div className="w-80 border-r border-black p-6 flex flex-col sticky top-0 h-[calc(100vh-65px)]">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-40 h-9 bg-black flex items-center justify-center p-2">
                <Image
                  src="/logo.svg"
                  alt="Hyperbrowser"
                  width={224}
                  height={224}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="border border-black p-4 mb-4">
            <label className="block">
              <span className="text-base font-medium mb-2 block">Upload Video</span>
              <input
                type="file"
                accept="video/*"
                onChange={handleUpload}
                disabled={uploading}
                className="w-full text-sm border border-black px-3 py-2"
              />
            </label>
            {uploading && <p className="text-sm mt-2">Processing video...</p>}
          </div>

          {videoUrl && (
            <div className="border border-black p-4">
              <p className="text-sm font-medium mb-2">Video Preview</p>
              <video
                src={videoUrl}
                controls
                className="w-full border border-black"
              />
            </div>
          )}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!runId ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-base">Upload a video to begin analysis</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Complete Analysis Button */}
              {!promptResult && !pricingResults && (
                <div className="border border-black p-6 bg-gray-50">
                  <button
                    onClick={handleCompleteAnalysis}
                    disabled={analyzing}
                    className="w-full px-6 py-4 bg-black text-white text-base font-bold disabled:opacity-50"
                  >
                    {analyzing ? 'Analyzing Video...' : 'Breakdown Video'}
                  </button>
                  <p className="text-sm text-gray-600 mt-3">
                    {hasAudio 
                      ? 'Transcribes audio, decodes prompt, estimates costs, and generates summary'
                      : 'Decodes prompt, estimates costs, and generates summary'}
                  </p>
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-300">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Keyframes Section */}
              {frames.length > 0 && (promptResult || pricingResults) && (
                <div className="border border-black">
                  <div className="border-b border-black px-4 py-3 bg-gray-50">
                    <h2 className="text-base font-bold">Extracted Keyframes</h2>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-3">
                      {frames.length} frames extracted @ 1 frame/second
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {frames.map((frame, i) => (
                        <div key={i} className="relative aspect-video border border-black">
                          <Image
                            src={frame}
                            alt={`Frame ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Section */}
              {hasAudio && audioTranscription && (
                <div className="border border-black">
                  <div className="border-b border-black px-4 py-3 bg-gray-50">
                    <h2 className="text-base font-bold">Audio Analysis</h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Audio Type</p>
                        <div className="flex gap-2">
                          {audioTranscription.has_speech && (
                            <span className="border border-black px-3 py-1.5 text-sm">Speech</span>
                          )}
                          {audioTranscription.has_music && (
                            <span className="border border-black px-3 py-1.5 text-sm">Music/SFX</span>
                          )}
                        </div>
                      </div>
                      {audioUrl && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Waveform</p>
                          <Waveform src={audioUrl} />
                        </div>
                      )}
                      {audioTranscription.has_speech && audioTranscription.text && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Transcription</p>
                          <p className="text-base bg-gray-50 p-3 border border-gray-300">{audioTranscription.text}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Duration: {audioTranscription.duration.toFixed(1)}s
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Prompt Section */}
              {promptResult && (
                <div className="border border-black">
                  <div className="border-b border-black px-4 py-3 bg-gray-50">
                    <h2 className="text-base font-bold">Prompt</h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Generated Prompt</p>
                        <p className="text-base leading-relaxed">{promptResult.prompt}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Style Tags</p>
                        <div className="flex gap-2 flex-wrap">
                          {promptResult.style_tags.map((tag, i) => (
                            <span key={i} className="border border-black px-3 py-1.5 text-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Confidence: {Math.round(promptResult.confidence * 100)}%
                        </p>
                      </div>

                      {promptResult.audio_context && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Audio Context</p>
                          <p className="text-base bg-gray-50 p-3 border border-gray-300">{promptResult.audio_context}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cost Estimation Section */}
              {pricingResults && (
                <div className="border border-black">
                  <div className="border-b border-black px-4 py-3 bg-gray-50">
                    <h2 className="text-base font-bold">Cost to Recreate</h2>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Estimated cost comparison across AI video platforms
                    </p>
                    <div className="space-y-3">
                      {pricingResults.map((pricing, i) => (
                        <div 
                          key={i} 
                          className={`border p-4 ${i === 0 ? 'border-black bg-gray-50' : 'border-gray-300'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-base font-bold">{pricing.platform}</h3>
                              {i === 0 && (
                                <span className="text-sm bg-black text-white px-2 py-1 mt-1 inline-block">
                                  BEST VALUE
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">{pricing.estimated_cost}</p>
                              <p className="text-sm text-gray-600">{pricing.cost_per_second}</p>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{pricing.pricing_model}</p>
                          
                          <div className="space-y-1 mb-3">
                            {pricing.features.slice(0, 3).map((feature, fi) => (
                              <p key={fi} className="text-sm">• {feature}</p>
                            ))}
                          </div>
                          
                          <a
                            href={pricing.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline font-medium"
                          >
                            Try {pricing.platform} →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Section */}
              {summary && (
                <div className="border border-black">
                  <div className="border-b border-black px-4 py-3 bg-gray-50">
                    <h2 className="text-base font-bold">Summary</h2>
                  </div>
                  <div className="p-4">
                    <p className="text-base leading-relaxed">{summary.summary}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}