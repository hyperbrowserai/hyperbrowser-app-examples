"use client";
import { motion } from "framer-motion";

interface TableSkeletonProps {
  rows?: number;
  progress?: number;
}

export default function TableSkeleton({ rows = 5, progress = 0 }: TableSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="card mt-8"
    >
      <div className="flex items-center mb-4">
        <svg className="icon mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <div className="flex items-center">
          <div className="h-5 bg-muted rounded w-16 animate-pulse"></div>
          <div className="ml-2 h-6 w-6 bg-accent/20 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      <div className="overflow-hidden border border-border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="py-3 px-4 text-left font-medium">Source</th>
                <th className="py-3 px-4 text-left font-medium">Title</th>
                <th className="py-3 px-4 text-left font-medium">Location</th>
                <th className="py-3 px-4 text-left font-medium whitespace-nowrap">Phone</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="border-t border-border"
                >
                  {/* Source Column */}
                  <td className="py-3 px-4 align-top">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-muted rounded mr-2 animate-pulse"></div>
                      <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                    </div>
                  </td>
                  
                  {/* Title Column */}
                  <td className="py-3 px-4 align-top">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
                    </div>
                  </td>
                  
                  {/* Location Column */}
                  <td className="py-3 px-4 align-top">
                    <div className="h-4 bg-muted rounded w-36 animate-pulse"></div>
                  </td>
                  
                  {/* Phone Column */}
                  <td className="py-3 px-4 align-top">
                    <div className="h-4 bg-muted rounded w-28 animate-pulse phone"></div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Loading indicator with progress */}
      <div className="mt-4 flex items-center justify-center text-muted-foreground">
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="flex flex-col items-center">
          <span className="text-sm">
            {progress < 30 ? "Starting research..." :
             progress < 60 ? "Scraping websites..." :
             progress < 90 ? "Extracting data..." :
             "Processing results..."}
          </span>
          {progress > 0 && (
            <div className="mt-2 w-32 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
