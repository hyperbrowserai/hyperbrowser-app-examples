'use client';

import { motion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

interface AnswerStreamProps {
  content: string;
  isStreaming: boolean;
  isCached?: boolean;
  onCitationClick?: (citationNumber: number) => void;
}

export default function AnswerStream({ content, isStreaming, isCached = false, onCitationClick }: AnswerStreamProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [citationHover, setCitationHover] = useState<number | null>(null);
  const [showDateContext, setShowDateContext] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Always show content immediately - no streaming animation
    setDisplayedContent(content);
    setShowDateContext(true);
  }, [content, isStreaming, isCached]);

  useEffect(() => {
    if (contentRef.current && !isCached) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [displayedContent, isCached]);

  const handleCitationClick = (citationNumber: number) => {
    onCitationClick?.(citationNumber - 1);
  };

  const getTodaysDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const parseMarkdownContent = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Enhanced citation processing - handle [1], [2], etc.
      const processedLine = line.split(/(\[\d+\])/g).map((part, partIndex) => {
        const citationMatch = part.match(/^\[(\d+)\]$/);
        if (citationMatch) {
          const citationNumber = parseInt(citationMatch[1]);
          return (
            <button
              key={`${lineIndex}-${partIndex}`}
              onMouseEnter={() => setCitationHover(citationNumber)}
              onMouseLeave={() => setCitationHover(null)}
              onClick={() => handleCitationClick(citationNumber)}
              className="relative inline-flex items-center justify-center w-5 h-5 mx-1 text-xs font-bold 
                         text-white bg-gray-800 hover:bg-black rounded border border-gray-600 
                         hover:border-gray-800 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              {citationNumber}
              {citationHover === citationNumber && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 
                             bg-black text-white text-xs rounded shadow-lg z-10 border border-green-700/20">
                  View source
                </div>
              )}
            </button>
          );
        }
        
        // Process styling within the part
        return processStyled(part);
      });

      // Handle different markdown elements - NO animations during streaming
      if (line.startsWith('#### ')) {
        return (
          <h4
            key={lineIndex}
            className="text-base font-bold text-black mt-5 mb-2 border-l-2 border-green-600 pl-2 bg-green-50 py-1 rounded-r"
          >
            {processStyled(line.replace('#### ', ''))}
          </h4>
        );
      }
      
      if (line.startsWith('### ')) {
        return (
          <h3
            key={lineIndex}
            className="text-lg font-bold text-black mt-6 mb-3 border-l-3 border-green-600 pl-3 bg-green-50 py-1 rounded-r"
          >
            {processStyled(line.replace('### ', ''))}
          </h3>
        );
      }
      
      if (line.startsWith('## ')) {
        return (
          <h2
            key={lineIndex}
            className="text-xl font-bold text-black mt-6 mb-4 border-l-4 border-green-600 pl-4 bg-green-50 py-2 rounded-r"
          >
            {processStyled(line.replace('## ', ''))}
          </h2>
        );
      }

      if (line.startsWith('# ')) {
        return (
          <h1
            key={lineIndex}
            className="text-2xl font-bold text-black mt-6 mb-4 border-l-4 border-green-600 pl-4 bg-green-50 py-2 rounded-r"
          >
            {processStyled(line.replace('# ', ''))}
          </h1>
        );
      }

      // Handle numbered lists - use the actual number from markdown
      const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
      if (numberedMatch) {
        const actualNumber = parseInt(numberedMatch[1]);
        
        return (
          <div
            key={lineIndex}
            className="flex items-start space-x-3 my-2 ml-4"
          >
            <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 text-sm font-semibold rounded-full flex items-center justify-center border border-green-300">
              {actualNumber}
            </span>
            <span className="text-gray-700 leading-relaxed">
              {processStyled(numberedMatch[2])}
            </span>
          </div>
        );
      }

      // Handle bullet points
      if (line.trim().startsWith('- ')) {
        return (
          <div
            key={lineIndex}
            className="flex items-start space-x-3 my-2 ml-4"
          >
            <span className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2 border border-green-700"></span>
            <span className="text-gray-700 leading-relaxed">
              {processStyled(line.replace(/^\s*-\s/, ''))}
            </span>
          </div>
        );
      }

      // Regular paragraphs
      if (line.trim()) {
        return (
          <p
            key={lineIndex}
            className="text-gray-800 leading-relaxed mb-4 text-base"
          >
            {processedLine}
          </p>
        );
      }

      return null;
    }).filter(Boolean);
  };

  // Enhanced processing for bold, italic, and inline code
  const processStyled = (text: string) => {
    if (typeof text !== 'string') return text;
    
    // More robust regex for markdown formatting
    // This handles nested formatting better and avoids conflicts
    const parts = [];
    let remaining = text;
    let key = 0;
    
    while (remaining.length > 0) {
      // Try to match bold first (**text**)
      const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)/);
      if (boldMatch) {
        if (boldMatch[1]) parts.push(boldMatch[1]);
        parts.push(<strong key={key++} className="font-bold text-gray-900">{boldMatch[2]}</strong>);
        remaining = boldMatch[3];
        continue;
      }
      
      // Try to match italic (*text*)
      const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*(.*)/);
      if (italicMatch) {
        if (italicMatch[1]) parts.push(italicMatch[1]);
        parts.push(<em key={key++} className="italic text-gray-700">{italicMatch[2]}</em>);
        remaining = italicMatch[3];
        continue;
      }
      
      // Try to match inline code (`text`)
      const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/);
      if (codeMatch) {
        if (codeMatch[1]) parts.push(codeMatch[1]);
        parts.push(<code key={key++} className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">{codeMatch[2]}</code>);
        remaining = codeMatch[3];
        continue;
      }
      
      // No more formatting found, add the rest
      parts.push(remaining);
      break;
    }
    
    return parts.length === 1 ? parts[0] : parts;
  };

  if (!content && !isStreaming) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white border border-gray-200/80 rounded-2xl p-8 shadow-sm"
    >
      {/* Date Context Banner */}
      {showDateContext && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3"
        >
          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Current Information</p>
            <p className="text-xs text-gray-600">
              Data accurate as of {getTodaysDate()}
            </p>
          </div>
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
        </motion.div>
      )}

      {/* Main Answer Content */}
      <div
        ref={contentRef}
        className="prose prose-gray max-w-none overflow-y-auto max-h-[600px] 
                   scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {parseMarkdownContent(displayedContent)}
      </div>

      {/* Footer with Hyperbrowser attribution */}
      {!isStreaming && content && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500"
        >
          <span>Powered by Hyperbrowser AI • Real-time web analysis</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <span>Live data</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
} 