"use client";

import { ArrowRight, Terminal, Square } from "lucide-react";

interface InputSectionProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  loading: boolean;
  placeholder?: string;
  helperText?: string;
  loadingText?: string;
  onStop?: () => void;
}

export default function InputSection({
  value,
  onChange,
  onGenerate,
  loading,
  placeholder = "Enter a topic (e.g., 'Supabase Auth') or URL...",
  helperText = "Powered by Hyperbrowser",
  loadingText = "Processing",
  onStop,
}: InputSectionProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto relative group">
      {/* Brutalist "Command Bar" Container */}
      <div className="relative flex items-center bg-white border-4 border-black shadow-brutal-lg transition-all group-focus-within:translate-x-[2px] group-focus-within:translate-y-[2px] group-focus-within:shadow-brutal">
        
        {/* Left Icon */}
        <div className="pl-6 text-black hidden sm:block">
          <Terminal size={24} strokeWidth={2.5} />
        </div>

        {/* Massive Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-6 py-6 text-xl sm:text-2xl font-bold bg-transparent border-none outline-none placeholder:text-gray-400 text-black"
          disabled={loading}
          required
          autoFocus
        />

        {/* Right Action Button */}
        <div className="pr-3 flex items-center gap-2">
          {loading && onStop && (
            <button
              type="button"
              onClick={onStop}
              className="h-12 px-4 bg-white text-black border-4 border-black font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:bg-gray-100 transition-colors shrink-0"
            >
              <Square size={16} strokeWidth={2.5} className="fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="h-12 px-6 bg-black text-white font-bold text-lg flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">{loadingText}</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Generate</span>
                <ArrowRight size={20} strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Helper Text */}
      <div className="mt-3 flex justify-between px-1 text-xs font-mono text-gray-500 uppercase tracking-wider">
        <span>{helperText}</span>
        <span>Press Enter ↵</span>
      </div>
    </form>
  );
}
