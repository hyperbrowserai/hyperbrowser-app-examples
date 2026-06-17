"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Terminal } from "lucide-react";

const EXAMPLES = [
  "Build a REST API for a todo app and run the test suite",
  "Scrape the top 5 Hacker News posts and build a comparison page",
  "Create a landing page for a coffee brand and show me a live preview",
  "Build a snake game in HTML canvas and run it",
];

interface TaskInputProps {
  loading: boolean;
  onSubmit: (task: string) => void;
}

export function TaskInput({ loading, onSubmit }: TaskInputProps) {
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit(e);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={submit}>
        <div className="group relative rounded-2xl border border-[#242424] bg-[#141414] transition-colors focus-within:border-[#3a3a3a]">
          <div className="flex items-start gap-3 px-5 pt-5">
            <Terminal size={18} className="mt-1 shrink-0 text-muted" strokeWidth={2} />
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              rows={3}
              autoFocus
              spellCheck={false}
              placeholder="Describe a task. The agent builds it in a live sandbox."
              className="w-full resize-none bg-transparent font-mono-code text-base leading-relaxed text-foreground outline-none placeholder:text-muted/70 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center justify-between px-5 pb-4 pt-1">
            <span className="font-mono-code text-[11px] uppercase tracking-widest text-muted/60">
              ⌘ + Enter to run
            </span>
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {loading ? "Running" : "Run"}
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={loading}
            onClick={() => {
              setValue(ex);
              if (!loading) onSubmit(ex);
            }}
            className="rounded-full border border-[#242424] bg-transparent px-3.5 py-1.5 text-left font-mono-code text-xs text-muted transition-colors hover:border-[#3a3a3a] hover:text-foreground disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
