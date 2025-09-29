"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface SidebarConsoleProps {
  logs: string[];
  isActive: boolean;
}

export default function SidebarConsole({ logs, isActive }: SidebarConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open when logs start appearing
  if (logs.length > 0 && !isOpen) {
    setIsOpen(true);
  }

  return (
    <>
      {/* Toggle Button - Fixed position */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ 
          opacity: isActive ? 1 : 0.6, 
          x: 0,
          scale: isActive ? 1.05 : 1
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-200 ${
          isActive 
            ? 'bg-accent text-black hover:bg-accent/90' 
            : 'bg-card text-muted-foreground hover:bg-muted/10'
        }`}
        aria-label={isOpen ? "Close console" : "Open console"}
      >
        <svg 
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
        
        {/* Activity indicator */}
        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
          />
        )}
      </motion.button>

      {/* Sidebar Console */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 lg:w-96 bg-card border-l border-border shadow-2xl z-40 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center">
                  <svg className="icon mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 17 10 11 4 5"></polyline>
                    <line x1="12" y1="19" x2="20" y2="19"></line>
                  </svg>
                  <h3 className="font-medium">Live Console</h3>
                  {logs.length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-accent/10 text-accent rounded-full">
                      {logs.length}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-muted/10 rounded-md transition-colors"
                  aria-label="Close console"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Console Content */}
              <div className="flex-1 overflow-hidden">
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4 17 10 11 4 5"></polyline>
                        <line x1="12" y1="19" x2="20" y2="19"></line>
                      </svg>
                      <p className="text-sm">Console output will appear here</p>
                      <p className="text-xs mt-1">Start a search to see live progress</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto">
                    <AnimatePresence>
                      {logs.map((log, i) => {
                        // Replace emoji with clean text and extract status
                        const cleanLog = log.replace(/[🔬📱🎯🕷️🔍🤖📊✅🎉❌⚡🚀🆕⚠️🧹🏁]/g, '');
                        const isError = log.includes('❌') || log.includes('failed') || log.includes('error');
                        const isSuccess = log.includes('✅') || log.includes('complete') || log.includes('successful');
                        const isWarning = log.includes('⚠️') || log.includes('warning');
                        
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.05 }}
                            className={`py-3 px-4 border-b border-border/50 last:border-b-0 flex items-start ${
                              isError ? 'bg-red-500/5 border-red-500/20' :
                              isSuccess ? 'bg-green-500/5 border-green-500/20' :
                              isWarning ? 'bg-yellow-500/5 border-yellow-500/20' :
                              'hover:bg-muted/5'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0 ${
                              isError ? 'bg-red-500' :
                              isSuccess ? 'bg-green-500' :
                              isWarning ? 'bg-yellow-500' :
                              'bg-accent'
                            }`} />
                            
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm leading-relaxed console ${
                                isError ? 'text-red-600 dark:text-red-400' :
                                isSuccess ? 'text-green-600 dark:text-green-400' :
                                isWarning ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-foreground'
                              }`}>
                                {cleanLog}
                              </span>
                              
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date().toLocaleTimeString()}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer */}
              {logs.length > 0 && (
                <div className="p-3 border-t border-border bg-muted/5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{logs.length} log entries</span>
                    <button
                      onClick={() => {
                        // This would need to be passed as a prop to clear logs
                        console.log('Clear logs requested');
                      }}
                      className="hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
