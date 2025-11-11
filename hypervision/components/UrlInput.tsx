'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UrlInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  placeholder?: string;
  showButton?: boolean;
  value?: string;
  onChange?: (url: string) => void;
}

export default function UrlInput({ 
  onAnalyze, 
  isLoading, 
  placeholder, 
  showButton = true,
  value: externalValue,
  onChange: externalOnChange
}: UrlInputProps) {
  const [internalUrl, setInternalUrl] = useState('');
  
  const url = externalValue !== undefined ? externalValue : internalUrl;
  const setUrl = externalOnChange || setInternalUrl;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyze(url.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`w-full p-6 ${showButton ? 'border-b border-border' : ''}`}
    >
      <form onSubmit={handleSubmit} className="flex gap-4">
        <Input
          type="url"
          placeholder={placeholder || "ENTER URL TO ANALYZE"}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-black border-white/20 text-white placeholder:text-white/40 placeholder:font-mono text-sm focus:border-white/60 transition-all normal-case"
        />
        {showButton && (
          <Button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="px-8 bg-white text-black hover:bg-white/90 font-mono text-sm transition-all"
          >
            {isLoading ? 'ANALYZING...' : 'ANALYZE'}
          </Button>
        )}
      </form>
    </motion.div>
  );
}

