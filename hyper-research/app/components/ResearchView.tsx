"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ComparisonData, ResearchResult } from '../types';
import { Loader2 } from 'lucide-react';

interface ResearchViewProps {
  isLoading?: boolean;
  synthesis?: string;
  comparisons?: ComparisonData[];
  results?: ResearchResult[];
  error?: string | null;
}

// Simple markdown renderer for synthesis
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Heading 1
    if (line.match(/^#\s+/)) {
      elements.push(
        <h1 key={key++} className="text-xl font-bold mt-6 mb-3 first:mt-0">
          {line.replace(/^#+\s+/, '').replace(/\*+$/, '').trim()}
        </h1>
      );
    }
    // Heading 2
    else if (line.match(/^##\s+/)) {
      elements.push(
        <h2 key={key++} className="text-lg font-semibold mt-5 mb-2 first:mt-0">
          {line.replace(/^#+\s+/, '').replace(/\*+$/, '').trim()}
        </h2>
      );
    }
    // Heading 3
    else if (line.match(/^###\s+/)) {
      elements.push(
        <h3 key={key++} className="text-base font-semibold mt-4 mb-2 first:mt-0">
          {line.replace(/^#+\s+/, '').replace(/\*+$/, '').trim()}
        </h3>
      );
    }
    // Heading 4+
    else if (line.match(/^####/)) {
      elements.push(
        <h4 key={key++} className="text-sm font-semibold mt-3 mb-2 first:mt-0">
          {line.replace(/^#+\s*/, '').replace(/\*+$/, '').trim()}
        </h4>
      );
    }
    // Separator
    else if (line.trim() === '---' || line.trim() === '___') {
      elements.push(
        <hr key={key++} className="my-4 border-t border-gray-300" />
      );
    }
    // Empty line
    else if (line.trim() === '') {
      // Skip multiple consecutive empty lines
      if (elements.length > 0 && elements[elements.length - 1].type !== 'br') {
        elements.push(<br key={key++} />);
      }
    }
    // Regular paragraph with bold support
    else {
      // Parse bold text (**text**)
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      
      elements.push(
        <p key={key++} className="text-sm text-gray-800 leading-relaxed mb-3">
          {formattedParts}
        </p>
      );
    }
  }

  return elements;
}

export function ResearchView({
  isLoading = false,
  synthesis = '',
  comparisons = [],
  results = [],
  error = null
}: ResearchViewProps) {
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="p-4 bg-red-50 rounded-full mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-bold text-lg text-black mb-2">Something went wrong</h3>
        <p className="text-sm text-gray-600 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="relative mb-8">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <h3 className="font-bold text-xl text-black mb-2">Analyzing sources...</h3>
        <p className="text-sm text-gray-500 font-medium">Scraping and processing with Claude</p>
      </div>
    );
  }

  if (!synthesis && results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="p-6 bg-gray-100 rounded-2xl mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="font-bold text-xl text-black mb-2">Ready to research</h3>
        <p className="text-sm text-gray-500 font-medium">Add URLs and click Research to start</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-8 space-y-6">
      {/* Synthesis Section */}
      {synthesis && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow animate-fadeIn">
          <div className="prose prose-sm max-w-none">
            {renderMarkdown(synthesis)}
          </div>
        </div>
      )}

      {/* Comparisons with Bar Charts */}
      {comparisons.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow animate-fadeIn">
          <h3 className="font-bold text-xl mb-6 tracking-tight">Visual Comparisons</h3>
          <div className="space-y-8">
            {comparisons.map((comp, idx) => (
              <div key={idx} className="border-t first:border-t-0 pt-6 first:pt-0">
                <h4 className="font-semibold text-base mb-4 text-gray-700">{comp.category}</h4>
                
                {/* Table view */}
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-gray-700">Source</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-gray-700">Finding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {comp.items.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-gray-700">{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bar chart for numeric values */}
                {comp.items.every(item => !isNaN(Number(item.value))) && (
                  <div className="mt-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comp.items}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#000000" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {results.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow animate-fadeIn">
          <h3 className="font-bold text-xl mb-4 tracking-tight">Sources ({results.length})</h3>
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate group-hover:text-black transition-colors">{result.title || result.url}</p>
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-black hover:underline truncate block mt-1 font-medium"
                    >
                      {result.url}
                    </a>
                    {result.metadata?.description && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                        {result.metadata.description}
                      </p>
                    )}
                  </div>
                  {result.error ? (
                    <span className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded-lg shrink-0 font-medium">Failed</span>
                  ) : (
                    <span className="w-6 h-6 flex items-center justify-center bg-black text-white rounded-full shrink-0 text-xs font-bold">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

