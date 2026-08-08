'use client';

import React, { useState } from 'react';
import { Play, Zap, Bot, User, ExternalLink } from 'lucide-react';
import StepIndicator, { StepStatus } from './components/StepIndicator';
import LogConsole from './components/LogConsole';

interface ScrapeResult {
  source: string;
  title?: string;
  content?: string;
  url?: string;
  jobId?: string;
  humanId?: string;
  message?: string;
  error?: string;
  failureReason?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<StepStatus>('idle');
  const [humanStatus, setHumanStatus] = useState<StepStatus>('idle');

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, message]);
  };

  const handleScrape = async () => {
    if (!url) {
      addMessage('Please enter a URL');
      return;
    }

    // Reset state
    setIsLoading(true);
    setResult(null);
    setMessages([]);
    setScrapeStatus('idle');
    setHumanStatus('idle');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              addMessage(data.message);
            } else if (data.type === 'step') {
              if (data.step === 'scrape') {
                setScrapeStatus(data.status);
              } else if (data.step === 'human') {
                setHumanStatus(data.status);
              }
            } else if (data.type === 'result') {
              setResult(data);
            } else if (data.type === 'error') {
              addMessage(`Error: ${data.error}`);
            }
          } catch {
            // Ignore JSON parse errors on partial chunks
          }
        }
      }
    } catch (error) {
      addMessage(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      id: 'scrape',
      label: 'Hyperbrowser',
      description: 'Automated scrape with stealth browser',
      icon: 'bot' as const,
      status: scrapeStatus,
    },
    {
      id: 'human',
      label: 'Human Pages',
      description: 'Hire a real human if automation fails',
      icon: 'human' as const,
      status: humanStatus,
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="glass-card border-b border-gray-600">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <h1 className="text-2xl font-bold">Human Fallback</h1>
            </div>
            <div className="text-sm text-gray-400">
              Hyperbrowser + Human Pages
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Input Card */}
        <div className="glass-card rounded-lg p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">
              Scrape any page &mdash; with a human safety net
            </h2>
            <p className="text-sm text-gray-400">
              Enter a URL below. Hyperbrowser will attempt an automated scrape.
              If the page is protected by a CAPTCHA, login wall, or other block,
              the app automatically falls back to{' '}
              <a
                href="https://humanpages.ai"
                target="_blank"
                className="text-accent hover:underline"
              >
                Human Pages
              </a>{' '}
              to hire a real person.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Target URL
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isLoading) handleScrape();
                }}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-lg"
                placeholder="https://example.com"
              />
            </div>

            <button
              onClick={handleScrape}
              disabled={isLoading || !url}
              className="w-full bg-accent text-black font-semibold py-4 px-6 rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner w-5 h-5" />
                  Scraping...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Scrape
                </>
              )}
            </button>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="mb-8">
          <StepIndicator steps={steps} />
        </div>

        {/* Activity Log */}
        <div className="glass-card rounded-lg p-6 mb-8">
          <LogConsole messages={messages} isActive={isLoading} />
        </div>

        {/* Result */}
        {result && (
          <div className="glass-card rounded-lg p-6 animate-in">
            {result.source === 'hyperbrowser' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-green-400">
                      Scraped by Hyperbrowser
                    </h2>
                    <p className="text-xs text-gray-400">{result.title}</p>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto scrollbar-hide">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {result.content}
                  </pre>
                </div>
              </>
            )}

            {result.source === 'humanpages' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-green-400">
                      Completed by Human
                    </h2>
                    <p className="text-xs text-gray-400">
                      Job {result.jobId} &middot; Human {result.humanId}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto scrollbar-hide">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {result.content}
                  </pre>
                </div>
              </>
            )}

            {result.source === 'humanpages-pending' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-yellow-400">
                      Human Hired &mdash; In Progress
                    </h2>
                    <p className="text-xs text-gray-400">
                      Job {result.jobId}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-300">{result.message}</p>
                  <a
                    href={`https://humanpages.ai/jobs/${result.jobId}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 mt-3 text-accent text-sm hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View job on Human Pages
                  </a>
                </div>
              </>
            )}

            {result.source === 'none' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-red-400">
                      Scrape Failed
                    </h2>
                    <p className="text-xs text-gray-400">
                      {result.failureReason}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-300">{result.error}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="glass-card border-t border-gray-600 mt-12">
        <div className="container mx-auto px-6 py-4">
          <div className="text-center text-sm text-gray-400">
            Powered by{' '}
            <a
              href="https://hyperbrowser.ai"
              target="_blank"
              className="text-accent hover:underline"
            >
              Hyperbrowser
            </a>
            {' + '}
            <a
              href="https://humanpages.ai"
              target="_blank"
              className="text-accent hover:underline"
            >
              Human Pages
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
