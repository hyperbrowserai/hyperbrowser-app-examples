"use client";

import { motion } from "framer-motion";
import { X, Download } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageUrl: string;
  pageTitle: string;
  onDownloadPDF: () => void;
  onDownloadMarkdown: () => void;
}

export default function ShareModal({ 
  isOpen, 
  onClose, 
  pageUrl, 
  pageTitle,
  onDownloadPDF,
  onDownloadMarkdown 
}: ShareModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Share Page</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted mb-2 block">Export</label>
            <button
              onClick={onDownloadPDF}
              className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">Download as PDF</span>
            </button>
            <button
              onClick={onDownloadMarkdown}
              className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">Download as Markdown</span>
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-gray-50">
          <p className="text-sm text-muted text-center">
            Follow <a href="https://twitter.com/hyperbrowser" target="_blank" rel="noopener noreferrer" className="underline">@hyperbrowser</a> for updates
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

