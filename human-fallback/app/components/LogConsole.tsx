'use client';

import React, { useEffect, useRef } from 'react';

interface LogConsoleProps {
  messages: string[];
  isActive: boolean;
}

export default function LogConsole({ messages, isActive }: LogConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-accent animate-pulse' : messages.length > 0 ? 'bg-gray-500' : 'bg-gray-700'}`} />
        <h3 className="text-sm font-semibold text-gray-300">Activity Log</h3>
      </div>
      <div
        ref={scrollRef}
        className="terminal-bg rounded-lg p-4 h-64 overflow-y-auto scrollbar-hide font-mono text-xs space-y-1"
      >
        {messages.length === 0 ? (
          <div className="text-gray-600">Waiting for input...</div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="animate-in">
              <span className="text-gray-600 mr-2">
                [{new Date().toLocaleTimeString()}]
              </span>
              <span className="text-gray-300">{msg}</span>
            </div>
          ))
        )}
        {isActive && (
          <div className="flex items-center gap-2 text-accent">
            <div className="loading-spinner w-3 h-3" />
            <span>Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
