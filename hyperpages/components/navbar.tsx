"use client";

import { motion } from "framer-motion";
import { ExternalLink, Download, MessageSquare } from "lucide-react";
import Button from "./button";

interface NavbarProps {
  pageTitle?: string;
  status?: string;
  onDownloadPDF?: () => void;
  onChatClick?: () => void;
}

export default function Navbar({ pageTitle, status, onDownloadPDF, onChatClick }: NavbarProps) {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {pageTitle && (
            <span className="text-sm font-normal text-muted truncate max-w-md">
              {pageTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {status && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
              <span>{status}</span>
            </div>
          )}

          {onChatClick && (
            <Button
              variant="secondary"
              icon={MessageSquare}
              onClick={onChatClick}
            >
              Chat with Research
            </Button>
          )}

          {onDownloadPDF && (
            <Button
              variant="secondary"
              icon={Download}
              onClick={onDownloadPDF}
            >
              Download PDF
            </Button>
          )}

          <Button
            variant="primary"
            icon={ExternalLink}
            onClick={() => window.open('https://hyperbrowser.ai', '_blank')}
          >
            Launch Hyperbrowser
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}

