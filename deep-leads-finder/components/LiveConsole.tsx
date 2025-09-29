"use client";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveConsole({ logs }: { logs: string[] }) {
  if (!logs.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="mt-6 mb-8 card"
    >
      <div className="flex items-center mb-3">
        <svg className="icon mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
        <h3 className="font-medium">Console</h3>
      </div>
      
      <div className="border border-border rounded-lg overflow-hidden">
        <AnimatePresence>
          {logs.map((log, i) => {
            // Replace emoji with clean text
            const cleanLog = log.replace(/[🔬📱🎯🕷️🔍🤖📊✅🎉❌]/g, '');
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12 }}
                className="py-2 px-3 border-b border-border last:border-b-0 flex items-start"
              >
                <svg className="icon mr-2 mt-0.5 flex-shrink-0 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1"></circle>
                </svg>
                <span className="text-sm console">{cleanLog}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}