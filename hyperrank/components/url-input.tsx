"use client";

import { useState, type FormEvent } from "react";
import { Globe, Search } from "lucide-react";

interface UrlInputProps {
  loading: boolean;
  onSubmit: (url: string) => void;
}

export function UrlInput({ loading, onSubmit }: UrlInputProps) {
  const [value, setValue] = useState("");

  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
  };

  return (
    <form onSubmit={handle} className="group w-full max-w-3xl mx-auto">
      <div className="relative flex items-center bg-white border-4 border-black shadow-brutal-lg transition-all group-focus-within:translate-x-[2px] group-focus-within:translate-y-[2px] group-focus-within:shadow-brutal">
        <div className="pl-6 text-black hidden sm:block">
          <Globe size={24} strokeWidth={2.5} />
        </div>
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="hyperbrowser.ai"
          disabled={loading}
          autoFocus
          className="w-full px-6 py-6 text-xl sm:text-2xl font-bold bg-transparent border-none outline-none placeholder:text-gray-400 text-black"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="m-3 h-14 px-6 bg-black text-white font-bold text-base uppercase tracking-wider flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Search size={18} strokeWidth={2.5} />
          <span>{loading ? "Scanning" : "Scan"}</span>
        </button>
      </div>
      <p className="mt-3 text-sm text-gray-500 text-center font-medium">
        Enter any company URL to check AI search visibility.
      </p>
    </form>
  );
}
