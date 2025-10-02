'use client';

import { useState } from 'react';
import { Search, Globe, AlertCircle, ChevronDown } from 'lucide-react';
import { useDocumentation } from '@/contexts/DocumentationContext';
import Image from 'next/image';

export function UrlInput() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(50);
  const { crawlDocumentation, isLoading, error, apiKey } = useDocumentation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    
    try {
      new URL(normalizedUrl); 
      await crawlDocumentation(normalizedUrl, maxPages);
    } catch (error) {
      console.error('Invalid URL:', error);
      await crawlDocumentation(normalizedUrl, maxPages);
    }
  };

  const popularDocs = [
    { name: 'React', url: 'react.dev' },
    { name: 'OpenAI', url: 'platform.openai.com/docs/overview' },
    { name: 'Tailwind CSS', url: 'tailwindcss.com' },
    { name: 'Hyperbrowser', url: 'hyperbrowser.ai' },
    { name: 'Stripe', url: 'stripe.com' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Image src="/logo.svg" alt="Documentation Buddy Logo" className="h-12 w-auto mx-auto" width={48} height={48} />
        </div>
        <div className="inline-flex items-center space-x-3 mb-4">
          <h1 className="text-5xl font-sans font-[600] tracking-tight02 text-white">
            Documentation Buddy
          </h1>
        </div>
        <p className="text-base text-gray-200 max-w-lg mx-auto leading-relaxed font-mono text-gray-300 font-medium tracking-tight02">
          AI POWERED DOCUMENTATION ASSISTANT FOR ANY WEBSITE. 
          <span className="text-[#F0FF26] font-medium  tracking-tight02"> CRAWL, LEARN, AND CHAT</span> WITH DOCUMENTATION IN SECONDS.
        </p>
      </div>

      {/* Main Form */}
      <div className="bg-black/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="url" className="block text-sm font-mono uppercase tracking-tight02 text-gray-300">
                Documentation URL
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter any documentation URL..."
                  className="w-full pl-12 pr-4 py-4  border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-[#F0FF26]/50 focus:border-[#F0FF26]/50 text-white placeholder-gray-500 text-lg transition-all duration-200"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label htmlFor="maxPages" className="block text-sm font-mono uppercase tracking-tight02 text-gray-300 mb-2">
                  Pages to Crawl
                </label>
                <div className="relative">
                  <select
                    id="maxPages"
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="w-full pl-4 pr-6 py-3 bg-transparent border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-[#F0FF26]/50 focus:border-[#F0FF26]/50 text-white transition-all duration-200 appearance-none"
                    disabled={isLoading}
                  >
                    <option value={25} className="bg-gray-900 text-white">25 pages</option>
                    <option value={50} className="bg-gray-900 text-white">50 pages</option>
                    <option value={100} className="bg-gray-900 text-white">100 pages</option>
                    <option value={200} className="bg-gray-900 text-white">200 pages</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !url.trim() || !apiKey}
                className="px-8 py-3 bg-[#F0FF26] text-black rounded-xl disabled:bg-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg flex items-center space-x-2 mt-7"
              >
                <Search className="h-5 w-5" />
                <span className="hidden sm:inline">
                  {isLoading ? 'Crawling...' : 'Start Crawling'}
                </span>
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-6 flex items-start space-x-3 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error occurred</p>
                <p className="text-sm text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Popular Sites */}
        <div className="border-t border-gray-800/50 bg-gray-900/30 px-8 py-6">
          <p className="text-sm font-mono uppercase tracking-tight02 text-gray-400 mb-4">Try popular documentation sites:</p>
          <div className="flex flex-wrap gap-3">
            {popularDocs.map((doc) => (
              <button
                key={doc.name}
                onClick={() => setUrl(doc.url)}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-gray-800/60 hover:bg-gray-700/60 text-gray-200 rounded-lg transition-all duration-200 disabled:opacity-50 border border-gray-700/50 hover:border-gray-600/50"
              >
                {doc.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 