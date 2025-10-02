'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, User, ExternalLink, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useChat } from 'ai/react';
import { useDocumentation } from '@/contexts/DocumentationContext';
import { MessageRenderer } from './MessageRenderer';
import { CrawledPage } from '@/lib/types';

export function ChatInterface() {
  const { currentDocumentation, clearDocumentation } = useDocumentation();
  const [showSources, setShowSources] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      documentation: currentDocumentation,
    },
    onResponse: async (response) => {
      if (!response.ok) {
        try {
          const text = await response.text();
          let message = response.statusText;
          try {
            const data = JSON.parse(text);
            message = data.error || message;
          } catch {
            message = text || message;
          }
          setChatError(`${response.status} ${message}`);
        } catch {
          setChatError(response.statusText);
        }
      } else {
        setChatError(null);
      }
    },
    onError: (error) => {
      setChatError(error.message || 'Failed to send message');
    },
  });

  const friendlyError = useMemo(() => {
    if (!chatError) return null;
    const lower = chatError.toLowerCase();
    if (lower.includes('openai api key not configured')) {
      return 'OpenAI API key is missing. Add OPENAI_API_KEY to .env.local and restart the dev server.';
    }
    if (lower.includes('insufficient_quota')) {
      return 'OpenAI quota exceeded. Check billing/usage or switch to a model available to your account.';
    }
    if (lower.includes('invalid api key') || lower.includes('incorrect api key')) {
      return 'Your OpenAI API key appears invalid. Double-check the value in .env.local.';
    }
    if (lower.includes('rate limit') || lower.includes('429')) {
      return 'Rate limited by the model. Please wait a moment and try again.';
    }
    return chatError;
  }, [chatError]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!currentDocumentation) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-100">
        <div className="text-center">
          <p>Please crawl documentation first to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 mb-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">

            <div>
              <h2 className="text-lg font-semibold tracking-tight02 text-white">
                Documentation Loaded
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>{currentDocumentation.pages.length} pages</span>
                <span>•</span>
                <a
                  href={currentDocumentation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F0FF26] inline-flex items-center transition-colors group"
                >
                  {new URL(currentDocumentation.url).hostname}
                  <ExternalLink className="h-3 w-3 ml-1 group-hover:text-[#F0FF26]" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-lg transition-all duration-200 border border-gray-700/50"
            >
              {showSources ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showSources ? 'Hide Sources' : 'View Sources'}</span>
            </button>

            <button
              onClick={clearDocumentation}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-lg transition-all duration-200 border border-gray-700/50"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>

        {showSources && (
          <div className="mt-6 pt-6 border-t border-gray-800/50">
            <h4 className="text-sm font-medium text-gray-300 mb-4">Documentation Sources ({currentDocumentation.pages.length} pages)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
              {currentDocumentation.pages.map((page: CrawledPage, index: number) => (
                <a
                  key={index}
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-black-900/50 hover:bg-gray-800/50 rounded-lg border border-gray-800/50 hover:border-gray-700/50 transition-all duration-200 group"
                >
                  <p className="text-sm font-medium text-gray-200 group-hover:text-[#F0FF26] transition-colors truncate">
                    {page.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {new URL(page.url).pathname}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-6 px-2 pb-36">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-white mb-2">Ready to help!</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Ask me anything about the documentation. I can help you understand concepts, find specific information, or provide code examples.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-10 h-10 bg-[#F0FF26] rounded-xl flex items-center justify-center">
              </div>
            )}

            <div
              className={`max-w-4xl rounded-2xl shadow-lg ${message.role === 'user'
                  ? 'bg-transparent text-white px-0 py-0'
                  : 'bg-black/90 backdrop-blur-xl border border-gray-800/50 text-white px-6 py-5'
                }`}
            >
              <MessageRenderer
                content={message.content}
                role={message.role as 'user' | 'assistant'}
              />
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-4">
            <div className="bg-black/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl px-6 py-5">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-gray-400 text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - fixed to bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-5">
        <div className="max-w-5xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me anything about the documentation..."
              className="flex-1 px-6 py-4 bg-black border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-[#F0FF26]/50 focus:border-[#F0FF26]/50 text-white placeholder-gray-500 text-lg transition-all duration-200"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-4 bg-[#F0FF26] text-black rounded-xl disabled:bg-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-semibold shadow-lg"
            >
              <Send className="h-5 w-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          {friendlyError && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-200 text-sm">
              {friendlyError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 