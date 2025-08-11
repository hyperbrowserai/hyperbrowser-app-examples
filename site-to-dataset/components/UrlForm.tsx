'use client';

import { useState } from 'react';
import { Globe, ArrowRight, Link, Layers } from 'lucide-react';
import TemplateSelector from './TemplateSelector';
import CrawlOptionsComponent from './CrawlOptions';
import { CrawlOptions } from '@/lib/crawler';

interface UrlFormProps {
  onSubmit: (url: string, templateId: string, crawlMode: boolean, crawlOptions?: CrawlOptions) => void;
  isProcessing: boolean;
}

export default function UrlForm({ onSubmit, isProcessing }: UrlFormProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('general');
  const [crawlMode, setCrawlMode] = useState(false);
  const [crawlOptions, setCrawlOptions] = useState<CrawlOptions>({
    maxPages: 10,
    sameDomainOnly: true,
    includePatterns: [],
    excludePatterns: [],
    depth: 2
  });

  const validateUrl = (input: string) => {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }
    
    if (!validateUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }
    
    setError('');
    onSubmit(url, selectedTemplate, crawlMode, crawlMode ? crawlOptions : undefined);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.example.com or https://blog.example.com"
            className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors bg-white"
            disabled={isProcessing}
          />
        </div>

        <TemplateSelector
          selectedTemplate={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
          disabled={isProcessing}
        />

        {/* Crawl Mode Toggle */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${crawlMode ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {crawlMode ? <Layers className="h-5 w-5 text-blue-600" /> : <Link className="h-5 w-5 text-gray-600" />}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {crawlMode ? 'Multi-Page Crawl' : 'Single Page Scrape'}
                </h3>
                <p className="text-sm text-gray-500">
                  {crawlMode 
                    ? `Crawl multiple pages automatically (up to ${crawlOptions.maxPages} pages)`
                    : 'Process only the provided URL'
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCrawlMode(!crawlMode)}
              disabled={isProcessing}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                crawlMode ? 'bg-blue-600' : 'bg-gray-200'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                crawlMode ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Crawl Options */}
        {crawlMode && (
          <CrawlOptionsComponent
            crawlOptions={crawlOptions}
            onOptionsChange={setCrawlOptions}
            disabled={isProcessing}
          />
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || !url}
          className="w-full bg-black text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <>
              <div className="spinner" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Generate Dataset</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {!isProcessing && (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Example: <span className="font-medium">https://docs.anthropic.com</span> or <span className="font-medium">https://platform.openai.com/docs</span>
            </p>
          </div>
        )}
      </form>
    </div>
  );
} 