'use client';

import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import SourceCard from './SourceCard';

interface Source {
  url: string;
  title: string;
  domain: string;
  favicon?: string;
  imageUrl?: string;
  charCount: number;
}

interface SourceCarouselProps {
  sources: Source[];
  loadingSources: number;
  onSourceClick?: (index: number) => void;
  highlightedIndex?: number;
}

export default function SourceCarousel({ 
  sources, 
  loadingSources, 
  onSourceClick,
  highlightedIndex 
}: SourceCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const x = useMotionValue(0);
  const scale = useSpring(1, { stiffness: 300, damping: 30 });
  const rotate = useTransform(x, [-100, 100], [-5, 5]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [sources.length, loadingSources]);

  // Auto-scroll to highlighted source
  useEffect(() => {
    if (highlightedIndex !== undefined && scrollRef.current) {
      const cardWidth = 320; // w-80 = 320px
      const scrollPosition = highlightedIndex * cardWidth;
      
      scrollRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = 320; // Card width
    const currentScroll = scrollRef.current.scrollLeft;
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;

    scrollRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  const totalCards = sources.length + loadingSources;

  if (totalCards === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative mb-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex items-center justify-between mb-4"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sources
        </h3>
        <div className="flex items-center space-x-2">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {sources.length} of {totalCards}
          </motion.span>
          {sources.length > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
              className="w-2 h-2 bg-green-400 rounded-full"
            />
          )}
        </div>
      </motion.div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Scroll Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ 
            opacity: canScrollLeft ? 1 : 0.3, 
            x: 0 
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-gray-800 
                     border border-gray-200 dark:border-gray-700 rounded-full shadow-lg flex items-center 
                     justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white
                     transition-colors duration-200 -ml-5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>

        {/* Right Scroll Button */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ 
            opacity: canScrollRight ? 1 : 0.3, 
            x: 0 
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-gray-800 
                     border border-gray-200 dark:border-gray-700 rounded-full shadow-lg flex items-center 
                     justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white
                     transition-colors duration-200 -mr-5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>

        {/* Scrollable Cards */}
        <div
          ref={scrollRef}
          className="flex space-x-4 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth px-1 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Actual Source Cards */}
          {sources.map((source, index) => (
            <motion.div
              key={`source-${index}`}
              style={{
                scale: highlightedIndex === index ? 1.05 : 1,
                boxShadow: highlightedIndex === index 
                  ? '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                  : undefined
              }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <SourceCard
                source={source}
                index={index}
                onClick={() => onSourceClick?.(index)}
              />
            </motion.div>
          ))}

          {/* Loading Skeleton Cards */}
          {Array.from({ length: loadingSources }).map((_, index) => (
            <SourceCard
              key={`loading-${index}`}
              index={sources.length + index}
              isLoading={true}
            />
          ))}
        </div>

        {/* Gradient Overlays */}
        <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: sources.length / totalCards }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
      >
        <div className="h-full bg-gray-400 dark:bg-gray-500 rounded-full" />
      </motion.div>
    </motion.div>
  );
} 