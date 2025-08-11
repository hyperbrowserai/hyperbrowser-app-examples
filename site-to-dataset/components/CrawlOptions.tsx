'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Globe, Filter, Layers } from 'lucide-react';
import { CrawlOptions } from '@/lib/crawler';

interface CrawlOptionsProps {
  crawlOptions: CrawlOptions;
  onOptionsChange: (options: CrawlOptions) => void;
  disabled?: boolean;
}

export default function CrawlOptionsComponent({ 
  crawlOptions, 
  onOptionsChange, 
  disabled = false 
}: CrawlOptionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (updates: Partial<CrawlOptions>) => {
    onOptionsChange({ ...crawlOptions, ...updates });
  };

  const handleIncludePatternsChange = (value: string) => {
    const patterns = value.split('\n').filter(p => p.trim()).map(p => p.trim());
    handleChange({ includePatterns: patterns });
  };

  const handleExcludePatternsChange = (value: string) => {
    const patterns = value.split('\n').filter(p => p.trim()).map(p => p.trim());
    handleChange({ excludePatterns: patterns });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
        disabled={disabled}
        className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Settings className="h-5 w-5 text-gray-500" />
          <div>
            <h3 className="font-medium text-gray-900">Multi-Page Crawl Settings</h3>
            <p className="text-sm text-gray-500">
              {crawlOptions.maxPages} pages max • {crawlOptions.sameDomainOnly ? 'Same domain' : 'Cross-domain'} • Depth {crawlOptions.depth}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      {/* Expanded Options */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200"
        >
          <div className="p-6 space-y-6">
            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Max Pages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Layers className="h-4 w-4 inline mr-1" />
                  Max Pages
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={crawlOptions.maxPages}
                  onChange={(e) => handleChange({ maxPages: parseInt(e.target.value) || 1 })}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">Limit: 1-50 pages</p>
              </div>

              {/* Crawl Depth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="h-4 w-4 inline mr-1" />
                  Crawl Depth
                </label>
                <select
                  value={crawlOptions.depth}
                  onChange={(e) => handleChange({ depth: parseInt(e.target.value) })}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
                >
                  <option value="1">1 level</option>
                  <option value="2">2 levels</option>
                  <option value="3">3 levels</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Link discovery depth</p>
              </div>

              {/* Domain Restriction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="h-4 w-4 inline mr-1" />
                  Domain Scope
                </label>
                <select
                  value={crawlOptions.sameDomainOnly ? 'same' : 'any'}
                  onChange={(e) => handleChange({ sameDomainOnly: e.target.value === 'same' })}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
                >
                  <option value="same">Same domain only</option>
                  <option value="any">Any domain</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Restrict crawling scope</p>
              </div>
            </div>

            {/* URL Patterns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Include Patterns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include URL Patterns
                </label>
                <textarea
                  value={crawlOptions.includePatterns.join('\n')}
                  onChange={(e) => handleIncludePatternsChange(e.target.value)}
                  disabled={disabled}
                  placeholder={`/docs/\n/guide/\n/api/`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black resize-none disabled:opacity-50"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  One pattern per line. Leave empty to include all URLs.
                </p>
              </div>

              {/* Exclude Patterns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exclude URL Patterns
                </label>
                <textarea
                  value={crawlOptions.excludePatterns.join('\n')}
                  onChange={(e) => handleExcludePatternsChange(e.target.value)}
                  disabled={disabled}
                  placeholder={`/blog/\n/news/\n.pdf`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black resize-none disabled:opacity-50"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  One pattern per line. URLs matching these will be skipped.
                </p>
              </div>
            </div>

            {/* Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOptionsChange({
                    maxPages: 10,
                    sameDomainOnly: true,
                    includePatterns: ['/docs/', '/guide/', '/tutorial/'],
                    excludePatterns: ['/blog/', '/news/', '/changelog/'],
                    depth: 2
                  })}
                  disabled={disabled}
                  className="px-3 py-1 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Documentation
                </button>
                <button
                  type="button"
                  onClick={() => onOptionsChange({
                    maxPages: 15,
                    sameDomainOnly: true,
                    includePatterns: ['/api/', '/reference/', '/endpoints/'],
                    excludePatterns: ['/blog/', '/pricing/', '/about/'],
                    depth: 1
                  })}
                  disabled={disabled}
                  className="px-3 py-1 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  API Reference
                </button>
                <button
                  type="button"
                  onClick={() => onOptionsChange({
                    maxPages: 20,
                    sameDomainOnly: true,
                    includePatterns: ['/learn/', '/tutorial/', '/guide/', '/getting-started/'],
                    excludePatterns: ['/forum/', '/community/', '/showcase/'],
                    depth: 3
                  })}
                  disabled={disabled}
                  className="px-3 py-1 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Learning Hub
                </button>
                <button
                  type="button"
                  onClick={() => onOptionsChange({
                    maxPages: 5,
                    sameDomainOnly: true,
                    includePatterns: [],
                    excludePatterns: [],
                    depth: 1
                  })}
                  disabled={disabled}
                  className="px-3 py-1 text-sm bg-white text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Simple (5 pages)
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    Multi-Page Crawling Tips
                  </h3>
                  <div className="mt-2 text-sm text-gray-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Start with smaller page limits (5-10) to test patterns</li>
                      <li>Use include patterns to focus on relevant sections</li>
                      <li>Exclude patterns help skip non-content pages (blogs, forums)</li>
                      <li>Higher quality datasets come from focused crawling</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
