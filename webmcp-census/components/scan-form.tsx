"use client";

import { useState } from "react";
import type { SiteResult } from "@/lib/types";

export function ScanForm({ onResult }: { onResult: (r: SiteResult) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      onResult(data as SiteResult);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-wrap items-center gap-3">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Check one more URL, e.g. https://example.com"
        className="min-w-0 flex-1 border-2 border-black px-3 py-2 outline-none focus:shadow-brutal-sm"
        disabled={busy}
      />
      <button
        type="submit"
        disabled={busy || !url.trim()}
        className="border-2 border-black bg-black px-4 py-2 font-semibold text-white shadow-brutal-sm disabled:opacity-50"
      >
        {busy ? "Checking…" : "List tools"}
      </button>
      <p className="w-full text-xs text-neutral-500">
        Opens one Hyperbrowser session (needs <code className="font-mono">HYPERBROWSER_API_KEY</code>{" "}
        on the server), lists declared tools, and stops the session. Ad-hoc checks are not saved to
        the results file.
      </p>
      {error && <p className="w-full text-sm font-semibold text-red-700">{error}</p>}
    </form>
  );
}
