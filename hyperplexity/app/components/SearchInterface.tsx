'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import FollowUpQuestions from './FollowUpQuestions';
import SourceCarousel from './SourceCarousel';
import AnswerStream from './AnswerStream';
import HistorySidebar from './HistorySidebar';

interface Source {
  url: string;
  title: string;
  domain: string;
  favicon?: string;
  imageUrl?: string;
  charCount: number;
  relevanceScore?: number;
  freshness?: number;
  credibilityScore?: number;
}

interface SearchResult {
  query: string;
  answer: string;
  sources: Source[];
  followUpQuestions: string[];
}

interface SearchSuggestion {
  text: string;
  category: string;
  icon: string;
}

const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  { text: "Latest AI developments in 2025", category: "Technology", icon: "T" },
  { text: "Stock market trends today", category: "Finance", icon: "F" },
  { text: "Climate change updates", category: "Environment", icon: "E" },
  { text: "Best programming languages to learn", category: "Tech Career", icon: "C" },
  { text: "Cryptocurrency news today", category: "Finance", icon: "C" },
  { text: "Space exploration recent discoveries", category: "Science", icon: "S" },
  { text: "Electric vehicle market analysis", category: "Automotive", icon: "A" },
  { text: "Remote work trends 2024", category: "Business", icon: "B" },
  { text: "Artificial intelligence regulation", category: "Policy", icon: "P" },
  { text: "Renewable energy breakthroughs", category: "Energy", icon: "E" }
];

export default function SearchInterface() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSources, setLoadingSources] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [highlightedSourceIndex, setHighlightedSourceIndex] = useState<number | undefined>();
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle search suggestions
  useEffect(() => {
    if (query.trim().length > 2) {
      const filtered = SEARCH_SUGGESTIONS.filter(suggestion =>
        suggestion.text.toLowerCase().includes(query.toLowerCase()) ||
        suggestion.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && !isLoading);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
    setSelectedSuggestion(-1);
  }, [query, isLoading]);

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      if (selectedSuggestion >= 0) {
        e.preventDefault();
        setQuery(filteredSuggestions[selectedSuggestion].text);
        setShowSuggestions(false);
        handleSearch(filteredSuggestions[selectedSuggestion].text);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
    }
  };

  const saveToHistory = (query: string, answer: string, sources: Source[], followUpQuestions: string[]) => {
    const historyItem = {
      id: Date.now().toString(),
      query,
      answer,
      sources,
      followUpQuestions,
      timestamp: new Date()
    };
    
    const existingHistory = JSON.parse(localStorage.getItem('search-history') || '[]');
    const newHistory = [historyItem, ...existingHistory.slice(0, 9)];
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  };

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setResult(null);
    setStreamingAnswer('');
    setCurrentSources([]);
    setFollowUpQuestions([]);
    setLoadingSources(8); // Increased from 5
    setIsFollowUpLoading(false);
    setHighlightedSourceIndex(undefined);
    setCurrentStatus('');
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let buffer = '';
      let finalAnswer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                setCurrentStatus(data.message);
              } else if (data.type === 'source') {
                setCurrentSources(prev => [...prev, data.source]);
                setLoadingSources(prev => Math.max(0, prev - 1));
              } else if (data.type === 'answer_chunk') {
                finalAnswer += data.chunk;
                setStreamingAnswer(finalAnswer);
              } else if (data.type === 'follow_up_questions') {
                setIsFollowUpLoading(true);
                setFollowUpQuestions(data.questions);
                setIsFollowUpLoading(false);
              } else if (data.type === 'complete') {
                const finalSources = currentSources.length > 0 ? currentSources : [];
                const finalFollowUpQuestions = data.follow_up_questions || [];
                
                setResult({
                  query: searchQuery,
                  answer: finalAnswer,
                  sources: finalSources,
                  followUpQuestions: finalFollowUpQuestions
                });
                
                saveToHistory(searchQuery, finalAnswer, finalSources, finalFollowUpQuestions);
                setLoadingSources(0);
                setCurrentStatus('');
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      
      console.error('Search error:', error);
      const errorResult = {
        query: searchQuery,
        answer: 'Sorry, there was an error processing your request. Please try again.',
        sources: [],
        followUpQuestions: []
      };
      setResult(errorResult);
      saveToHistory(searchQuery, errorResult.answer, [], []);
    } finally {
      setIsLoading(false);
      setLoadingSources(0);
      setCurrentStatus('');
    }
  };

  const handleCitationClick = (citationIndex: number) => {
    setHighlightedSourceIndex(citationIndex);
    setTimeout(() => setHighlightedSourceIndex(undefined), 3000);
  };

  const handleSourceClick = (index: number) => {
    const source = currentSources[index];
    if (source) {
      window.open(source.url, '_blank');
    }
  };

  const handleHistorySelect = (session: any) => {
    setQuery(session.query);
    setIsHistoryOpen(false);
    
    // Restore the complete session without re-searching
    setResult({
      query: session.query,
      answer: session.answer,
      sources: session.sources || [],
      followUpQuestions: session.followUpQuestions || []
    });
    setCurrentSources(session.sources || []);
    setFollowUpQuestions(session.followUpQuestions || []);
    setStreamingAnswer('');
    setIsLoading(false);
    setLoadingSources(0);
    setIsFollowUpLoading(false);
    setCurrentStatus('');
  };

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch(suggestion.text);
  };

  const hasContent = isLoading || currentSources.length > 0 || streamingAnswer || result;

  return (
    <div className="main-app bg-white text-black">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0 bg-white/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex items-center space-x-3"
        >
          <div className="w-8 h-8 rounded-lg shadow-sm relative overflow-hidden">
            <Image
              src="/hb-logo.png"
              alt="Hyperbrowser Logo"
              width={32}
              height={32}
              className="object-contain rounded-lg"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-black">
            Hyperplexity
          </h1>
          <span className="px-2 py-1 text-xs font-medium bg-[#D9FF9D]/10 text-gray-800 rounded-full border border-[#D9FF9D]/30">
            AI Search
          </span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex items-center space-x-3"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsHistoryOpen(true)}
            className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.open('https://hyperbrowser.ai', '_blank')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black bg-white hover:bg-[#D9FF9D] border border-gray-200 hover:border-[#D9FF9D] rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
          >
            Login
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {!hasContent ? (
          // Centered Search Screen
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-4xl w-full">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="text-6xl font-bold mb-4 text-black"
              >
                Hyperplexity
              </motion.h1>
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                className="flex items-center justify-center space-x-2 mb-12"
              >
                <span className="text-lg text-gray-600">open-source perplexity clone, powered by</span>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                  className="relative"
                >
                  <Image
                    src="/Yellow BG.png"
                    alt="Hyperbrowser"
                    width={120}
                    height={30}
                    className="object-contain rounded-full"
                    priority
                  />
                </motion.div>
              </motion.div>
              
              {/* Enhanced Search Bar with Suggestions */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                className="w-full max-w-2xl mx-auto relative"
              >
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                  <div className="relative group">
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => query.trim().length > 2 && setShowSuggestions(true)}
                      onBlur={() => {
                        // Delay hiding suggestions to allow clicking
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      placeholder="Ask me anything... I'll search the web and give you comprehensive answers"
                      disabled={isLoading}
                      className="relative w-full px-6 py-5 pr-20 rounded-2xl focus:outline-none focus-visible:outline-none disabled:bg-gray-50 text-gray-900 placeholder-gray-400/60 text-base font-normal shadow-sm hover:shadow-lg transition-all duration-300 bg-white/90 backdrop-blur-sm"
                    />
                    
                    <motion.button
                      type="submit"
                      disabled={isLoading || !query.trim()}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 group"
                    >
                      <div className="relative">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gray-400 rounded-xl blur opacity-0 group-hover:opacity-20 disabled:opacity-0 transition-opacity duration-300"></div>
                        
                        {/* Main button */}
                        <div className="relative px-4 py-3 bg-black hover:bg-gray-800 text-white rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-sm border border-gray-300/30 hover:border-gray-400/50 disabled:border-gray-300">
                          {isLoading ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                          ) : (
                            <motion.div
                              initial={{ rotate: 0 }}
                              whileHover={{ rotate: -15, scale: 1.1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </form>

                {/* Search Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      {filteredSuggestions.map((suggestion, index) => (
                        <motion.button
                          key={suggestion.text}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ backgroundColor: '#f9fafb' }}
                          onClick={() => selectSuggestion(suggestion)}
                          className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors duration-150 ${
                            selectedSuggestion === index 
                              ? 'bg-[#D9FF9D]/20 border-l-2 border-[#D9FF9D]' 
                              : 'hover:bg-gray-50/80'
                          }`}
                        >
                          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-600">{suggestion.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {suggestion.text}
                            </p>
                            <p className="text-xs text-gray-500">
                              {suggestion.category}
                            </p>
                          </div>
                          <svg 
                            className="w-4 h-4 text-gray-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {/* Suggestion Cards */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 max-w-4xl mx-auto"
              >
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSearch("Latest Nvidia AI chip developments and market impact 2024")}
                  className="group p-5 text-left border border-gray-200/80 rounded-xl hover:border-[#D9FF9D]/40 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white/60 via-white/50 to-[#D9FF9D]/3 backdrop-blur-sm hover:bg-[#D9FF9D]/5 hover:from-[#D9FF9D]/8 hover:to-[#D9FF9D]/12"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-gray-100 to-[#D9FF9D]/8 rounded-lg group-hover:bg-[#D9FF9D]/20 group-hover:from-[#D9FF9D]/15 group-hover:to-[#D9FF9D]/25 transition-all duration-300 border border-gray-200/80 border-r-[#D9FF9D]/20 border-b-[#D9FF9D]/20 group-hover:border-[#D9FF9D]/30">
                      <svg className="w-4 h-4 text-gray-700 group-hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1 text-sm group-hover:text-black">Business & AI</p>
                  <p className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-700">Latest Nvidia developments and market impact</p>
                </motion.button>
                
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSearch("OpenAI vs Anthropic vs Google - latest AI model comparison 2024")}
                  className="group p-5 text-left border border-gray-200/80 rounded-xl hover:border-[#D9FF9D]/40 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white/60 via-white/50 to-[#D9FF9D]/3 backdrop-blur-sm hover:bg-[#D9FF9D]/5 hover:from-[#D9FF9D]/8 hover:to-[#D9FF9D]/12"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-gray-100 to-[#D9FF9D]/8 rounded-lg group-hover:bg-[#D9FF9D]/20 group-hover:from-[#D9FF9D]/15 group-hover:to-[#D9FF9D]/25 transition-all duration-300 border border-gray-200/80 border-r-[#D9FF9D]/20 border-b-[#D9FF9D]/20 group-hover:border-[#D9FF9D]/30">
                      <svg className="w-4 h-4 text-gray-700 group-hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1 text-sm group-hover:text-black">AI Technology</p>
                  <p className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-700">Compare latest AI models and capabilities</p>
                </motion.button>
                
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSearch("Current global economic trends and market outlook")}
                  className="group p-5 text-left border border-gray-200/80 rounded-xl hover:border-[#D9FF9D]/40 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white/60 via-white/50 to-[#D9FF9D]/3 backdrop-blur-sm hover:bg-[#D9FF9D]/5 hover:from-[#D9FF9D]/8 hover:to-[#D9FF9D]/12"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-gray-100 to-[#D9FF9D]/8 rounded-lg group-hover:bg-[#D9FF9D]/20 group-hover:from-[#D9FF9D]/15 group-hover:to-[#D9FF9D]/25 transition-all duration-300 border border-gray-200/80 border-r-[#D9FF9D]/20 border-b-[#D9FF9D]/20 group-hover:border-[#D9FF9D]/30">
                      <svg className="w-4 h-4 text-gray-700 group-hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1 text-sm group-hover:text-black">Current Events</p>
                  <p className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-700">Explore global economic trends and outlook</p>
                </motion.button>
              </motion.div>
            </div>
          </div>
        ) : (
          // Results Area with Enhanced Status
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6 space-y-8">
              {/* Enhanced Status Indicator */}
              {(isLoading || currentStatus) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-[#D9FF9D]/10 to-[#D9FF9D]/5 border border-[#D9FF9D]/20 rounded-xl p-4 flex items-center space-x-3"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-[#D9FF9D] border-t-transparent rounded-full"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {currentStatus || 'Processing your request...'}
                    </p>
                    {loadingSources > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${((8 - loadingSources) / 8) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {8 - loadingSources}/8 sources
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {(currentSources.length > 0 || loadingSources > 0) && (
                <SourceCarousel
                  sources={currentSources}
                  loadingSources={loadingSources}
                  onSourceClick={handleSourceClick}
                  highlightedIndex={highlightedSourceIndex}
                />
              )}

              {(streamingAnswer || result?.answer) && (
                <AnswerStream
                  content={streamingAnswer || result?.answer || ''}
                  isStreaming={isLoading && !!streamingAnswer}
                  isCached={!isLoading && !streamingAnswer && !!result?.answer}
                  onCitationClick={handleCitationClick}
                />
              )}

              {(followUpQuestions.length > 0 || isFollowUpLoading) && (
                <FollowUpQuestions
                  questions={followUpQuestions}
                  onQuestionClick={handleSearch}
                  isLoading={isFollowUpLoading}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleHistorySelect}
      />
    </div>
  );
} 