"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingText({ text, isStreaming, className = "" }: StreamingTextProps) {
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!isStreaming) {
      setShowCursor(false);
      return;
    }

    // Blink cursor every 500ms
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className={`relative ${className}`}>
      <div className="prose prose-neutral max-w-none prose-headings:font-semibold prose-headings:text-neutral-900 prose-p:text-neutral-800 prose-p:leading-relaxed prose-strong:font-semibold prose-strong:text-neutral-900 prose-ul:my-4 prose-li:text-neutral-800 prose-li:marker:text-neutral-400">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
      
      {isStreaming && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: showCursor ? 1 : 0 }}
          className="inline-block w-2 h-4 bg-neutral-900 ml-1 rounded-sm align-middle"
        />
      )}
    </div>
  );
}

