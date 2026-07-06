"use client";

import { Play, Square } from "lucide-react";
import { FormEvent, useState } from "react";

type UrlFormProps = {
  running: boolean;
  onStart: (url: string, maxPages: number) => void;
  onStop: () => void;
};

export function UrlForm({ running, onStart, onStop }: UrlFormProps) {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(15);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!url.trim() || running) {
      return;
    }

    onStart(url.trim(), maxPages);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 border-y border-[var(--border)] py-5 md:grid-cols-[1fr_8rem_auto]"
    >
      <label className="flex flex-col gap-2">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-[var(--subtle)]">
          Website URL
        </span>
        <input
          required
          type="url"
          value={url}
          placeholder="https://hyperbrowser.ai"
          onChange={(event) => setUrl(event.target.value)}
          className="h-12 border border-[var(--border)] bg-transparent px-4 font-mono text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--subtle)] focus:border-[rgba(246,245,242,0.34)]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-[var(--subtle)]">
          Max pages
        </span>
        <input
          min={1}
          max={100}
          type="number"
          value={maxPages}
          onChange={(event) => setMaxPages(Number(event.target.value))}
          className="h-12 border border-[var(--border)] bg-transparent px-4 font-mono text-sm text-[var(--foreground)] outline-none transition focus:border-[rgba(246,245,242,0.34)]"
        />
      </label>

      {running ? (
        <button
          type="button"
          onClick={onStop}
          className="mt-auto flex h-12 items-center justify-center gap-2 border border-[var(--foreground)] px-5 font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:bg-[rgba(246,245,242,0.08)]"
        >
          <Square size={15} />
          Stop
        </button>
      ) : (
        <button
          type="submit"
          className="mt-auto flex h-12 items-center justify-center gap-2 border border-[var(--foreground)] bg-[var(--foreground)] px-5 font-mono text-xs uppercase tracking-[0.18em] text-[var(--background)] transition hover:opacity-85"
        >
          <Play size={15} />
          Run crawl
        </button>
      )}
    </form>
  );
}
