"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Globe, Loader2, ExternalLink, ChevronRight, X } from "lucide-react";
import { SearchResult } from "@/lib/hyperbrowser";
import { useState } from "react";

interface SourcesSidebarProps {
  searchResults: SearchResult[] | undefined;
  isSearching: boolean;
  isBackgroundResearch?: boolean;
  processingStage?: "extracting" | "researching" | "completed" | null;
  onClose: () => void;
}

export function SourcesSidebar({ searchResults, isSearching, isBackgroundResearch = false, processingStage = null, onClose }: SourcesSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Show sidebar if searching OR if we have results (including cached results) OR if background research is running
  const hasResults = searchResults && searchResults.length > 0;
  if (!isSearching && !hasResults && !isBackgroundResearch) {
    return null;
  }

  const sources = [
    { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov", icon: Globe },
  ];

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: isCollapsed ? 60 : 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="h-screen bg-neutral-50/50 border-l border-neutral-200 flex flex-col backdrop-blur-sm transition-all duration-300 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-neutral-100">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
            {isBackgroundResearch ? "Analyzing PDF" : "PubMed Research"}
          </h2>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors text-neutral-500"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-180" />}
          </button>
          {!isCollapsed && (
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors text-neutral-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {processingStage && !isCollapsed && (
          <div className="mb-4 space-y-3">
            {/* Stage 1: Extracting */}
            <div className={`p-3 rounded-xl border transition-all ${
              processingStage === "extracting" 
                ? "bg-neutral-100 border-neutral-300" 
                : "bg-white border-neutral-200"
            }`}>
              <div className="flex items-center gap-2">
                {processingStage === "extracting" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-900" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-neutral-900" />
                )}
                <span className={`text-xs font-semibold ${
                  processingStage === "extracting" ? "text-neutral-900" : "text-neutral-600"
                }`}>
                  {processingStage === "extracting" ? "Extracting health markers..." : "PDF processed"}
                </span>
              </div>
            </div>
            
            {/* Stage 2: Researching */}
            {(processingStage === "researching" || processingStage === "completed") && (
              <div className={`p-3 rounded-xl border transition-all ${
                processingStage === "researching" 
                  ? "bg-neutral-100 border-neutral-300" 
                  : "bg-white border-neutral-200"
              }`}>
                <div className="flex items-center gap-2">
                  {processingStage === "researching" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-900" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-neutral-900" />
                  )}
                  <span className={`text-xs font-semibold ${
                    processingStage === "researching" ? "text-neutral-900" : "text-neutral-600"
                  }`}>
                    {processingStage === "researching" 
                      ? "Searching PubMed..." 
                      : "Research completed"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        {isCollapsed ? (
          // Collapsed View
          <div className="flex flex-col items-center gap-4 pt-4">
            {sources.map((source) => {
              const result = searchResults?.find(r => r.source === source.name);
              const status = isSearching && !result ? "searching" : result ? "found" : "pending";
              
              return (
                <div key={source.name} className="relative group">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                    status === "found" ? "bg-neutral-900 text-white" :
                    status === "searching" ? "bg-neutral-200 text-neutral-900" :
                    "bg-neutral-100 text-neutral-400"
                  }`}>
                    {status === "searching" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : status === "found" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <source.icon className="h-4 w-4" />
                    )}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {source.name}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Expanded View
          <div className="space-y-4">
            {sources.map((source) => {
              const result = searchResults?.find(r => r.source === source.name);
              const status = isSearching && !result ? "searching" : result ? "found" : "pending";

              return (
                <motion.div
                  key={source.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-3 transition-all duration-300 ${
                    status === "found" 
                      ? "bg-white border-neutral-300 shadow-sm" 
                      : status === "searching"
                      ? "bg-neutral-50 border-neutral-200 shadow-sm"
                      : "bg-neutral-50/50 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-md flex items-center justify-center ${
                        status === "found" ? "bg-neutral-900 text-white" :
                        status === "searching" ? "bg-neutral-200 text-neutral-900" :
                        "bg-neutral-100 text-neutral-400"
                      }`}>
                        {status === "searching" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : status === "found" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <source.icon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span className={`text-sm font-medium ${
                        status === "pending" ? "text-neutral-400" : "text-neutral-900"
                      }`}>
                        {source.name}
                      </span>
                    </div>
                    {status === "found" && (
                      <span className="text-[10px] font-medium bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-full">
                        {result?.studies.length} results
                      </span>
                    )}
                  </div>

                  {/* Status Text / URL */}
                  <div className="pl-8">
                    {status === "searching" ? (
                      <p className="text-xs text-neutral-600 animate-pulse">
                        Visiting source...
                      </p>
                    ) : status === "found" ? (
                      <div className="space-y-2">
                        <a 
                          href={result?.studies[0]?.url || source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-neutral-400 hover:text-neutral-600 flex items-center gap-1 transition-colors truncate"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {new URL(result?.studies[0]?.url || source.url).hostname}
                        </a>
                        {result?.studies[0] && (
                          <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                            {result.studies[0].title}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">
                        Waiting to search...
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
