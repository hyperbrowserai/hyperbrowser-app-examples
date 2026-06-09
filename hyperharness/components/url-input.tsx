"use client";

import { GitBranch, Wrench } from "lucide-react";
import { useState } from "react";

interface Props {
  loading: boolean;
  onSubmit: (repoUrl: string) => void;
}

export function UrlInput({ loading, onSubmit }: Props) {
  const [value, setValue] = useState("");

  function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handle} className="group w-full max-w-3xl mx-auto">
      <div className="relative flex items-center bg-white border-4 border-black shadow-brutal-lg transition-all group-focus-within:translate-x-[2px] group-focus-within:translate-y-[2px] group-focus-within:shadow-brutal">
        <div className="pl-6 text-black hidden sm:block">
          <GitBranch size={24} strokeWidth={2.5} />
        </div>
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://github.com/user/repo"
          disabled={loading}
          autoFocus
          className="w-full px-6 py-6 text-lg sm:text-2xl font-mono font-bold bg-transparent border-none outline-none placeholder:text-gray-400 text-black"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="m-3 h-14 px-6 bg-black text-white font-bold text-sm sm:text-base uppercase tracking-wider flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Wrench size={18} strokeWidth={2.5} />
          <span className="hidden sm:inline">
            {loading ? "Working" : "Generate Harness"}
          </span>
          <span className="sm:hidden">{loading ? "Working" : "Run"}</span>
        </button>
      </div>
      <p className="mt-3 text-sm text-gray-500 text-center font-medium">
        Powered by Hyperbrowser Sandboxes. Runs a real coding agent against your repo.
      </p>
    </form>
  );
}
