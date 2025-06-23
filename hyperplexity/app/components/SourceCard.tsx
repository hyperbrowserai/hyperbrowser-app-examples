'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';

interface SourceCardProps {
  source?: {
    url: string;
    title: string;
    domain: string;
    favicon?: string;
    imageUrl?: string;
    charCount: number;
    relevanceScore?: number;
    freshness?: number;
    credibilityScore?: number;
  };
  index: number;
  isLoading?: boolean;
  onClick?: () => void;
}

export default function SourceCard({ source, index, isLoading = false, onClick }: SourceCardProps) {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className="flex-shrink-0 w-80 h-52 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
      >
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
            <div className="ml-auto w-8 h-4 bg-gray-300 rounded-full"></div>
          </div>
          <div className="w-full h-20 bg-gray-300 dark:bg-gray-600 rounded-lg mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
            <div className="flex space-x-2">
              <div className="w-12 h-4 bg-gray-300 rounded-full"></div>
              <div className="w-12 h-4 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!source) return null;

  const hasValidImage = source.imageUrl && !imageError;
  
  // Calculate display scores
  const relevancePercent = Math.round((source.relevanceScore || 0.5) * 100);
  const freshnessPercent = Math.round((source.freshness || 0.5) * 100);
  const credibilityPercent = Math.round((source.credibilityScore || 0.5) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        scale: 1.02, 
        y: -4,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex-shrink-0 w-80 h-52 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer shadow-sm hover:shadow-md dark:hover:shadow-lg transition-shadow duration-300 group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className="relative w-5 h-5 flex-shrink-0"
          >
            {source.favicon && !faviconError ? (
              <Image
                src={source.favicon}
                alt={`${source.domain} favicon`}
                width={20}
                height={20}
                className="rounded-sm"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <div className="w-5 h-5 bg-gray-400 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {source.domain.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
              {source.domain}
            </p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center space-x-2"
        >
          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400">
            [{index + 1}]
          </span>
        </motion.div>
      </div>

      {/* Preview Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="relative w-full h-16 mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border border-gray-200/50 dark:border-gray-600/50"
      >
        {hasValidImage ? (
          <Image
            src={source.imageUrl!}
            alt="Preview"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500"
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-medium">Article</span>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-3 h-10 flex items-start leading-tight group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200"
      >
        {source.title}
      </motion.h3>

      {/* Metadata with Scores */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="flex items-center justify-between text-xs"
      >
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 dark:text-gray-400">
            {Math.round(source.charCount / 100) / 10}k chars
          </span>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full"
          />
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Relevance Score */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200"
            title={`Relevance: ${relevancePercent}%`}
          >
            {relevancePercent}%
          </motion.div>
          
          {/* Freshness Indicator */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200"
            title={`Freshness: ${freshnessPercent}%`}
          >
            {freshnessPercent}%
          </motion.div>
          
          {/* Credibility Score */}
          {source.credibilityScore && source.credibilityScore > 0.6 && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200"
              title={`Credibility: ${credibilityPercent}%`}
            >
              {credibilityPercent}%
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
} 