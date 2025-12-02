"use client";

import React, { useState } from 'react';
import { ResearchView } from './components/ResearchView';
import { ScoresSidebar } from './components/ScoresSidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { Settings, X } from 'lucide-react';
import { ResearchResponse } from './types';

function ResearchContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [urls, setUrls] = useState<string[]>(['']);
  const [question, setQuestion] = useState('');
  const [researchData, setResearchData] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { 
    hyperbrowserKey, 
    openaiKey,
    anthropicKey,
    setHyperbrowserKey, 
    setOpenaiKey,
    setAnthropicKey,
    isHyperbrowserKeySet 
  } = useSettings();

  const addUrl = () => {
    setUrls([...urls, '']);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const removeUrl = (index: number) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  const handleResearch = async () => {
    const validUrls = urls.filter(u => u.trim());
    if (validUrls.length === 0 || !isHyperbrowserKeySet) return;

    setIsResearching(true);
    setError(null);
    setResearchData(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: validUrls,
          question: question.trim() || undefined,
          hyperbrowserKey,
          anthropicKey: anthropicKey || openaiKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Research failed');
      }

      setResearchData(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-black font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black rounded-lg">
            <img 
              src="/hyperbrowser_symbol-DARK.svg" 
              alt="Hyperbrowser" 
              className="h-5 w-auto invert"
            />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">Hyper-Research</h1>
            <p className="text-xs text-gray-500 font-medium">Powered by Hyperbrowser</p>
          </div>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 hover:shadow-md transition-all relative group"
          title="Settings"
        >
          <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          {!isHyperbrowserKeySet && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0">
        {/* Left Panel: Input */}
        <aside className="w-[420px] bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-sm mb-3 uppercase tracking-wider text-gray-700">Research Question</h2>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know? e.g., 'Compare pricing and features'"
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black resize-none bg-gray-50 hover:bg-white transition-colors"
              rows={3}
            />
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm uppercase tracking-wider text-gray-700">URLs to Analyze</h2>
              <button 
                onClick={addUrl}
                className="text-xs px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 hover:shadow-md font-medium"
              >
                + Add URL
              </button>
            </div>

            {urls.map((url, index) => (
              <div key={index} className="flex items-center gap-2 animate-fadeIn">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black font-mono bg-gray-50 hover:bg-white transition-colors"
                />
                {urls.length > 1 && (
                  <button 
                    onClick={() => removeUrl(index)}
                    className="p-2.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleResearch}
              disabled={isResearching || !isHyperbrowserKeySet || urls.filter(u => u.trim()).length === 0}
              className="w-full py-3.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isResearching ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Researching...
                </span>
              ) : (
                `Research ${urls.filter(u => u.trim()).length} ${urls.filter(u => u.trim()).length === 1 ? 'URL' : 'URLs'}`
              )}
            </button>
            {!isHyperbrowserKeySet && (
              <p className="text-xs text-gray-500 mt-3 text-center font-medium">
                Add API keys in settings to start
              </p>
            )}
          </div>
        </aside>

        {/* Center Panel: Results */}
        <section className="flex-1 min-h-0">
          <ResearchView 
            isLoading={isResearching}
            synthesis={researchData?.synthesis}
            comparisons={researchData?.comparisons}
            results={researchData?.results}
            error={error}
          />
        </section>

        {/* Right Sidebar: Scores */}
        {researchData?.scores && researchData.scores.length > 0 && (
          <ScoresSidebar scores={researchData.scores} />
        )}
      </main>

      <SettingsPanel 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hyperbrowserKey={hyperbrowserKey}
        openaiKey={openaiKey}
        anthropicKey={anthropicKey}
        onSaveHyperbrowser={setHyperbrowserKey}
        onSaveOpenai={setOpenaiKey}
        onSaveAnthropic={setAnthropicKey}
      />
    </div>
  );
}

export default function Home() {
  return (
    <SettingsProvider>
      <ResearchContent />
    </SettingsProvider>
  );
}
