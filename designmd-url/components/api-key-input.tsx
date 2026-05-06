"use client";

import { KeyRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { setApiKey } from "@/lib/storage";

interface ApiKeyInputProps {
  onSaved: () => void;
}

export function ApiKeyInput({ onSaved }: ApiKeyInputProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setBusy(true);
    setApiKey(trimmed);
    setBusy(false);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl">
      <div className="flex flex-col gap-6 border-4 border-black bg-white p-8 shadow-brutal-lg transition-all">
        <div className="flex items-center gap-3 text-black">
          <KeyRound size={26} strokeWidth={2.5} aria-hidden />
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Hyperbrowser API key</h2>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Stored in this browser only. Never uploaded to DESIGNMD servers.
            </p>
          </div>
        </div>
        <label className="sr-only" htmlFor="hb-api-key">
          Hyperbrowser API key
        </label>
        <input
          id="hb-api-key"
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="hb_xxxxxxxx"
          disabled={busy}
          className="w-full border-4 border-black bg-white px-4 py-4 text-base font-bold text-black outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-black"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://hyperbrowser.ai"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold uppercase tracking-wide text-gray-600 underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-2 py-1"
          >
            Get your key at hyperbrowser.ai
          </a>
          <button
            type="submit"
            disabled={!value.trim() || busy}
            className="inline-flex justify-center bg-black px-8 py-3 text-base font-black uppercase tracking-wider text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
          >
            Save key
          </button>
        </div>
      </div>
    </form>
  );
}
