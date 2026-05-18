"use client";

import { AnimatePresence, motion } from "framer-motion";

interface LoadingStateProps {
  message: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-3 py-12 font-mono text-[14px] text-[#a3a3a3]">
      <motion.span
        className="h-2 w-2 rounded-full bg-[#fafafa]"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <AnimatePresence mode="wait">
        <motion.span
          key={message}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          {message}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
