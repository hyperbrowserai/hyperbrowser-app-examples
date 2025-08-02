'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Source {
  url: string;
  title: string;
  domain: string;
  favicon?: string;
  imageUrl?: string;
  charCount: number;
}

interface HistoryItem {
  id: string;
  query: string;
  answer: string;
  sources: Source[];
  followUpQuestions: string[];
  timestamp: Date;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (session: HistoryItem) => void;
}

export default function HistorySidebar({ isOpen, onClose, onSelectSession }: HistorySidebarProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem('search-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.map((item: any) => ({
          ...item,
          sources: item.sources || [],
          followUpQuestions: item.followUpQuestions || [],
          timestamp: new Date(item.timestamp)
        })));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('search-history');
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 200,
              mass: 0.8
            }}
            className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-l 
                       border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Search History
              </h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 
                           text-gray-500 dark:text-gray-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </motion.div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {history.length > 0 ? (
                <>
                  {/* Clear Button */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 border-b border-gray-100 dark:border-gray-800"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clearHistory}
                      className="w-full text-left text-sm text-red-600 dark:text-red-400 
                                 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                      Clear all history
                    </motion.button>
                  </motion.div>

                  {/* History List */}
                  <div className="flex-1 overflow-y-auto">
                    {history.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => onSelectSession(item)}
                        className="p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer
                                   hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                      >
                        <motion.div
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.p 
                            className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-2
                                       group-hover:text-blue-600 dark:group-hover:text-blue-400"
                            animate={{ 
                              color: hoveredItem === item.id 
                                ? 'rgb(37, 99, 235)' 
                                : undefined 
                            }}
                          >
                            {item.query}
                          </motion.p>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                            {item.answer.substring(0, 100)}...
                          </p>
                          
                          <motion.div
                            initial={{ opacity: 0.7 }}
                            whileHover={{ opacity: 1 }}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                {formatTimeAgo(item.timestamp)}
                              </span>
                              {item.sources.length > 0 && (
                                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400">
                                  {item.sources.length} sources
                                </span>
                              )}
                            </div>
                            <motion.svg
                              className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100"
                              initial={{ x: -10, opacity: 0 }}
                              whileHover={{ x: 0, opacity: 1 }}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M9 5l7 7-7 7" />
                            </motion.svg>
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex-1 flex items-center justify-center p-8"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
                    >
                      <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21Z" />
                      </svg>
                    </motion.div>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No search history yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Your past searches will appear here
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 