"use client";

import { ArrowRight, Globe } from "lucide-react";
import { FormEvent } from "react";

interface UrlInputProps {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

export function UrlInput({ value, onChange, onGenerate, loading }: UrlInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onGenerate();
  };

  return (
    <form onSubmit={handleSubmit} className="group mx-auto w-full max-w-4xl">
      <div className="mb-3 flex flex-col justify-between gap-1 px-1 text-[11px] font-bold uppercase tracking-widest text-gray-500 sm:flex-row">
        <span>Hyperbrowser web.fetch branding</span>
        <span>Press Enter</span>
      </div>
      <div className="shadow-brutal-lg flex transition-all duration-150 group-focus-within:shadow-brutal group-focus-within:translate-x-[2px] group-focus-within:translate-y-[2px]">
        <div className="flex w-full flex-wrap items-center border-4 border-black bg-white sm:flex-nowrap">
          <div className="hidden pl-5 text-black sm:flex sm:items-center">
            <Globe size={22} strokeWidth={2.5} aria-hidden />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="stripe.com"
            disabled={loading}
            required
            className="min-w-[12rem] flex-1 px-4 py-5 text-xl font-black tracking-tight text-black placeholder:text-gray-400 outline-none bg-transparent disabled:opacity-60 sm:text-2xl sm:py-6 sm:pl-6"
          />
          <div className="flex w-full shrink-0 items-center justify-end gap-2 border-t-4 border-black p-3 sm:w-auto sm:border-t-0 sm:pr-3">
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="inline-flex h-12 items-center gap-2 bg-black px-6 text-base font-black uppercase tracking-wider text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-4 border-white border-t-transparent" />
                  <span className="hidden sm:inline">Working</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Generate</span>
                  <ArrowRight size={20} strokeWidth={3} aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
