"use client";

import { Globe, Search } from "lucide-react";
import { useState, type FormEvent } from "react";

const SUGGESTIONS = [
  "Find the pricing page",
  "Sign up for the newsletter",
  "Find the API docs",
];

interface Props {
  loading: boolean;
  onSubmit: (url: string, task: string) => void;
}

export function UrlInput({ loading, onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [task, setTask] = useState("");

  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !task.trim() || loading) return;
    onSubmit(url.trim(), task.trim());
  };

  return (
    <form onSubmit={handle} className="w-full max-w-3xl mx-auto">
      <div className="group flex items-center bg-white border-4 border-black shadow-brutal-lg transition-all focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-brutal">
        <div className="pl-6 text-black hidden sm:block">
          <Globe size={24} strokeWidth={2.5} />
        </div>
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="hyperbrowser.ai"
          disabled={loading}
          autoFocus
          className="w-full px-6 py-5 text-lg sm:text-xl font-bold bg-transparent border-none outline-none placeholder:text-gray-400 text-black"
        />
      </div>

      <div className="mt-4 border-4 border-black bg-white shadow-brutal">
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="What should agents be able to do? e.g. Find pricing and start checkout."
          rows={3}
          disabled={loading}
          className="w-full px-5 py-4 text-base font-medium bg-transparent border-none outline-none placeholder:text-gray-400 text-black resize-none"
        />
        <div className="flex items-center justify-between gap-3 border-t-4 border-black p-3">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setTask(s)}
                disabled={loading}
                className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim() || !task.trim()}
            className="shrink-0 h-12 px-5 bg-black text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Search size={16} strokeWidth={2.5} />
            <span>{loading ? "Scanning" : "Scan"}</span>
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-500 text-center font-medium">
        Powered by Hyperbrowser. Runs four real AI browser agents in parallel.
      </p>
    </form>
  );
}
