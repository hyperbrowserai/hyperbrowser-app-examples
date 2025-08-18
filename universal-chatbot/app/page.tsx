'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

interface FormData {
  urls: { value: string }[];
}

interface ChatFormData {
  message: string;
}

interface ScrapedData {
  url: string;
  title: string;
  description: string;
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [scrapedData, setScrapedData] = useState<ScrapedData[] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { register, control, handleSubmit: handleUrlSubmit } = useForm<FormData>({
    defaultValues: {
      urls: [{ value: '' }]
    }
  });

  const { register: registerChat, handleSubmit: handleChatSubmit, reset: resetChat } = useForm<ChatFormData>({
    defaultValues: { message: '' }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "urls"
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const onScrape = async (data: FormData) => {
    setLoading(true);
    setScrapedData(null);
    setMessages([]);

    try {
      const urlList = data.urls.map(url => url.value.trim()).filter(url => url !== '');
      
      if (urlList.length === 0) {
        return;
      }

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList }),
      });

      const result = await res.json();
      
      if (res.ok && result.success) {
        setScrapedData(result.data);
        setMessages([
          {
            role: 'assistant',
            content: `I've extracted content from ${result.data.length} website${result.data.length > 1 ? 's' : ''}. What would you like to know?`
          }
        ]);
      } else {
        console.error(result.error);
      }
    } catch (error) {
      console.error('Failed to scrape content');
    } finally {
      setLoading(false);
    }
  };

  const onChat = async (data: ChatFormData) => {
    if (!scrapedData || !data.message.trim()) return;
    
    const userMessage = data.message.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    resetChat();
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scrapedData,
          message: userMessage
        }),
      });

      const result = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error processing your request.' 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 flex flex-col">
      {!scrapedData ? (
        // Step 1: URL Input Form
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-5xl font-bold mb-12 text-center bg-gradient-to-r from-[#F0FF25] to-[#D6E528] text-transparent bg-clip-text">
            Chat with Any Website
          </h1>
          
          <div className="w-full max-w-xl bg-[#111111] rounded-2xl p-8 shadow-2xl border border-[#222222]">
            <form onSubmit={handleUrlSubmit(onScrape)} className="space-y-6">
              <div className="space-y-4">
                <label className="block text-lg font-medium text-[#F0FF25] mb-4">
                  Website URLs
                </label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <input
                      {...register(`urls.${index}.value`)}
                      placeholder="https://example.com"
                      className="flex-1 px-4 py-3 bg-[#0A0A0A] border-2 border-[#222222] rounded-xl focus:outline-none focus:border-[#F0FF25] text-gray-100 placeholder-gray-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="px-4 py-3 bg-red-900/20 hover:bg-red-900/40 rounded-xl text-red-400 border-2 border-red-900/30 transition-colors"
                      disabled={fields.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => append({ value: '' })}
                  className="w-full py-3 px-4 bg-[#0A0A0A] hover:bg-[#111111] rounded-xl text-gray-300 border-2 border-[#222222] hover:border-[#333333] flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="text-xl">+</span> Add Another URL
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl shadow-lg text-black bg-[#F0FF25] hover:bg-[#D6E528] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111111] focus:ring-[#F0FF25] font-medium transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Extracting Content...' : 'Extract Content'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // Step 2: Chat Interface
        <div className="flex-1 flex flex-col h-screen max-h-screen">
          {/* Header with extracted sources */}
          <div className="bg-[#111111] border-b border-[#222222] p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <h1 className="text-xl font-bold text-[#F0FF25]">Chat with Websites</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Sources:</span>
                <div className="flex gap-1">
                  {scrapedData.map((data, index) => (
                    <a 
                      key={index}
                      href={data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-2 py-1 bg-[#0A0A0A] rounded-md text-xs text-gray-300 hover:text-[#F0FF25] border border-[#222222] truncate max-w-[150px]"
                      title={data.title || data.url}
                    >
                      {data.title || new URL(data.url).hostname}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#0A0A0A]">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user' 
                        ? 'bg-[#F0FF25] text-black rounded-tr-none' 
                        : 'bg-[#111111] text-gray-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
              
              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#111111] text-gray-200 rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Chat input */}
          <div className="bg-[#111111] border-t border-[#222222] p-4">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleChatSubmit(onChat)} className="flex gap-2">
                <input
                  {...registerChat('message', { required: true })}
                  className="flex-1 px-4 py-3 bg-[#0A0A0A] border-2 border-[#222222] rounded-xl focus:outline-none focus:border-[#F0FF25] text-gray-100 placeholder-gray-500 transition-colors"
                  placeholder="Ask a question about the websites..."
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl shadow-lg text-black bg-[#F0FF25] hover:bg-[#D6E528] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111111] focus:ring-[#F0FF25] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}