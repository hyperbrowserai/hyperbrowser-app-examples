"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { SearchResult } from "@/lib/hyperbrowser";

interface SourceState {
  source: "PubMed" | "WHO" | "CDC";
  status: "searching" | "found" | "collapsed";
  title?: string;
  count?: number;
}

interface ThinkingAnimationProps {
  searchResults?: SearchResult[];
  isSearching: boolean;
}

export function ThinkingAnimation({ searchResults, isSearching }: ThinkingAnimationProps) {
  const [sources, setSources] = useState<SourceState[]>([]);
  const [currentPhase, setCurrentPhase] = useState<"searching" | "found" | "collapsed">("searching");

  useEffect(() => {
    if (!isSearching || !searchResults) {
      setSources([]);
      return;
    }

    // Simulate sequential source discovery
    const sourceOrder: Array<"PubMed" | "WHO" | "CDC"> = ["PubMed", "WHO", "CDC"];
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex >= sourceOrder.length) {
        clearInterval(interval);
        // Collapse all after a brief pause
        setTimeout(() => {
          setCurrentPhase("collapsed");
        }, 800);
        return;
      }

      const sourceName = sourceOrder[currentIndex];
      const result = searchResults.find(r => r.source === sourceName);

      // Add as "searching"
      setSources(prev => [...prev, {
        source: sourceName,
        status: "searching",
      }]);

      // After 500ms, mark as "found" if we have results
      setTimeout(() => {
        if (result && result.studies.length > 0) {
          setSources(prev => prev.map(s => 
            s.source === sourceName 
              ? { 
                  ...s, 
                  status: "found",
                  title: result.studies[0].title,
                  count: result.studies.length,
                }
              : s
          ));

          // After 800ms, collapse this source
          setTimeout(() => {
            setSources(prev => prev.map(s => 
              s.source === sourceName 
                ? { ...s, status: "collapsed" }
                : s
            ));
          }, 800);
        }
      }, 500);

      currentIndex++;
    }, 1200); // Stagger each source by 1.2s

    return () => clearInterval(interval);
  }, [isSearching, searchResults]);

  if (!isSearching || sources.length === 0) {
    return null;
  }

  const totalFound = searchResults?.reduce((acc, r) => acc + r.studies.length, 0) || 0;
  const allCollapsed = currentPhase === "collapsed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="px-2 space-y-2"
    >
      {allCollapsed ? (
        // Final collapsed state
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-neutral-600"
        >
          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
          <span>Found {totalFound} sources. Analyzing...</span>
        </motion.div>
      ) : (
        // Individual source animations
        <AnimatePresence mode="popLayout">
          {sources.map((source) => (
            <motion.div
              key={source.source}
              layout
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: source.status === "found" ? "auto" : source.status === "collapsed" ? 28 : 24,
                opacity: 1 
              }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {source.status === "searching" && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Searching {source.source}...</span>
                </div>
              )}

              {source.status === "found" && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-neutral-900">{source.source}</div>
                      <div className="text-neutral-600 truncate">{source.title}</div>
                    </div>
                  </div>
                </div>
              )}

              {source.status === "collapsed" && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="font-medium">{source.source}</span>
                  {source.count && (
                    <span className="text-neutral-400">({source.count})</span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

