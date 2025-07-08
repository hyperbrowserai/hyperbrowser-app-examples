'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface FollowUpQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  isLoading?: boolean;
}

export default function FollowUpQuestions({ 
  questions, 
  onQuestionClick, 
  isLoading = false 
}: FollowUpQuestionsProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mt-8"
      >
        <motion.h3
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-lg font-semibold mb-6 text-gray-900 flex items-center space-x-3"
        >
          <span>Follow-up Questions</span>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"
          />
        </motion.h3>
        
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <motion.div
              key={`skeleton-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
              className="h-12 bg-gray-100 rounded-xl animate-pulse border border-gray-200"
              style={{ width: `${70 + Math.random() * 30}%` }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  if (!questions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-8"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex items-center space-x-3 mb-6"
      >
        <h3 className="text-lg font-semibold text-gray-900">
          Follow-up Questions
        </h3>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3, type: "spring", stiffness: 400 }}
          className="flex items-center space-x-2"
        >
          <div className="w-2 h-2 bg-[#D9FF9D] rounded-full" />
          <span className="text-sm text-gray-500 font-medium">
            {questions.length}
          </span>
        </motion.div>
      </motion.div>

      <div className="space-y-3">
        <AnimatePresence>
          {questions.map((question, index) => (
            <motion.button
              key={`question-${index}`}
              initial={{ 
                opacity: 0, 
                x: -20,
                scale: 0.95
              }}
              animate={{ 
                opacity: 1, 
                x: 0,
                scale: 1
              }}
              exit={{ 
                opacity: 0, 
                x: 20,
                scale: 0.95
              }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              whileHover={{ 
                scale: 1.02,
                x: 4,
                transition: { 
                  duration: 0.2,
                  ease: "easeOut"
                }
              }}
              whileTap={{ 
                scale: 0.98,
                transition: { duration: 0.1 }
              }}
              onClick={() => onQuestionClick(question)}
              className="group w-full text-left px-6 py-4 bg-white border border-gray-200 rounded-xl 
                         hover:bg-gray-50 hover:border-[#D9FF9D]/40 
                         transition-all duration-300 shadow-sm hover:shadow-md
                         focus:outline-none focus:ring-2 focus:ring-[#D9FF9D]/40 focus:border-[#D9FF9D]/60"
            >
              <div className="flex items-center justify-between">
                <motion.span
                  className="text-sm font-medium text-gray-700 group-hover:text-gray-900 
                             transition-colors duration-200 pr-4 leading-relaxed"
                  layout
                >
                  {question}
                </motion.span>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.6, scale: 1 }}
                  whileHover={{ opacity: 1, scale: 1.1, x: 2 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-[#D9FF9D] 
                             transition-colors duration-200"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              </div>
              
              {/* Subtle bottom border accent */}
              <motion.div
                className="absolute bottom-0 left-6 right-6 h-0.5 bg-[#D9FF9D] opacity-0 
                           group-hover:opacity-100 transition-opacity duration-300"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Clean, minimal call-to-action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-6 text-center"
      >
        <p className="text-xs text-gray-400 font-light">
          Click any question to explore further
        </p>
      </motion.div>
    </motion.div>
  );
} 