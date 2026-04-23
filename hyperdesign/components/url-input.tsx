"use client";

import { ArrowRight, Terminal } from "lucide-react";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  loading: boolean;
  loadingLabel: string;
}

export default function UrlInput({
  value,
  onChange,
  onGenerate,
  loading,
  loadingLabel,
}: UrlInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto relative group"
    >
      <div className="relative flex items-center bg-white border-4 border-black shadow-brutal-lg transition-all group-focus-within:translate-x-[2px] group-focus-within:translate-y-[2px] group-focus-within:shadow-brutal">
        <div className="pl-6 text-black hidden sm:block">
          <Terminal size={24} strokeWidth={2.5} />
        </div>

        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-6 py-6 text-xl sm:text-2xl font-bold bg-transparent border-none outline-none placeholder:text-gray-400 text-black font-mono"
          disabled={loading}
          required
          autoFocus
        />

        <div className="pr-3">
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="h-12 px-6 bg-black text-white font-bold text-lg flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors border-2 border-black"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline max-w-[200px] truncate text-sm font-mono font-semibold">
                  {loadingLabel}
                </span>
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

      <div className="mt-3 flex justify-between px-1 text-xs font-mono text-gray-500 uppercase tracking-wider">
        <span>Powered by Hyperbrowser</span>
        <span>Enter ↵</span>
      </div>
    </form>
  );
}
