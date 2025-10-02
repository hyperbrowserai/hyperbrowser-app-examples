'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LoadingState() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    const start = Date.now();
    const interval = setInterval(() => {
      if (isCancelled) return;
      const elapsed = (Date.now() - start) / 1000; // seconds
      // Ease-out growth: fast at start, slow near 90%
      const target = Math.min(90, 100 * (1 - Math.exp(-elapsed / 2)));
      setProgress((prev) => (target > prev ? Math.min(target, 90) : prev));
    }, 200);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-black/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-12 text-center space-y-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
          
           
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight02 text-white">Crawling Documentation</h2>
            <p className="text-lg font-mono tracking-tight02  text-gray-300 max-w-lg mx-auto">
             ANALYZING PAGES AND EXTRACTING CONTENT...
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-3 text-gray-400">
          </div>
        </div>
        
        {/* Progress Section */}
        <div className="border-t border-gray-800/50 bg-gray-900/30 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-[#F0FF26] font-medium">Processing...</span>
            </div>
            
          {/* Progress bar */}
          <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[#F0FF26] rounded-full transition-all duration-200"
              style={{ width: `${Math.round(progress)}%` }}
            ></div>
          </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mt-6">
              <div className="flex items-center space-x-3 text-sm text-gray-400">
                <div className="w-2 h-2 bg-[#F0FF26] rounded-full animate-pulse"></div>
                <span>Discovering pages</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-400">
                <div className="w-2 h-2 bg-[#F0FF26] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <span>Extracting content</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-400">
                <div className="w-2 h-2 bg-[#F0FF26] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <span>Processing data</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 