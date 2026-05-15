"use client";

import { motion } from "framer-motion";

function Bar({ className }: { className?: string }) {
  return <div className={`shimmer ${className ?? ""}`} />;
}

export function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      <div className="bg-surface border border-border p-8 space-y-4">
        <Bar className="h-3 w-24" />
        <Bar className="h-8 w-3/4" />
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-5/6" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-surface border border-border p-6 space-y-3"
          >
            <Bar className="h-3 w-16" />
            <Bar className="h-10 w-24" />
            <Bar className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border p-8 space-y-4">
        <Bar className="h-4 w-32" />
        {[0, 1, 2, 3].map((i) => (
          <Bar key={i} className="h-4 w-full" />
        ))}
      </div>
    </motion.div>
  );
}
