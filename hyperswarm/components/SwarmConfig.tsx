"use client";

import type { BrowserUseLlm } from "@hyperbrowser/sdk/types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const LLMS: BrowserUseLlm[] = [
  "gpt-5-mini",
  "gpt-5",
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4o-mini",
  "gpt-4o",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
];

type Props = {
  maxAgents: number;
  setMaxAgents: (n: number) => void;
  maxSteps: number;
  setMaxSteps: (n: number) => void;
  timeoutSeconds: number;
  setTimeoutSeconds: (n: number) => void;
  useStealth: boolean;
  setUseStealth: (v: boolean) => void;
  useProxy: boolean;
  setUseProxy: (v: boolean) => void;
  solveCaptchas: boolean;
  setSolveCaptchas: (v: boolean) => void;
  agentLlm: BrowserUseLlm;
  setAgentLlm: (m: BrowserUseLlm) => void;
};

export function SwarmConfig({
  maxAgents,
  setMaxAgents,
  maxSteps,
  setMaxSteps,
  timeoutSeconds,
  setTimeoutSeconds,
  useStealth,
  setUseStealth,
  useProxy,
  setUseProxy,
  solveCaptchas,
  setSolveCaptchas,
  agentLlm,
  setAgentLlm,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 font-sans text-xs text-zinc-600 transition hover:text-zinc-950"
      >
        Swarm configuration
        <ChevronDown
          className={`size-4 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-zinc-200 px-4 py-4">
          <label className="block">
            <span className="font-sans text-xs text-zinc-600">
              Max agents ({maxAgents})
            </span>
            <input
              type="range"
              min={5}
              max={20}
              value={maxAgents}
              onChange={(e) => setMaxAgents(Number(e.target.value))}
              className="mt-2 w-full accent-zinc-900"
            />
          </label>
          <label className="block">
            <span className="font-sans text-xs text-zinc-600">
              Max steps per agent ({maxSteps})
            </span>
            <input
              type="range"
              min={10}
              max={50}
              value={maxSteps}
              onChange={(e) => setMaxSteps(Number(e.target.value))}
              className="mt-2 w-full accent-zinc-900"
            />
          </label>
          <label className="block">
            <span className="font-sans text-xs text-zinc-600">
              Timeout per agent ({timeoutSeconds}s)
            </span>
            <input
              type="range"
              min={30}
              max={300}
              step={10}
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
              className="mt-2 w-full accent-zinc-900"
            />
          </label>
          <label className="flex items-center gap-2 font-sans text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={useStealth}
              onChange={(e) => setUseStealth(e.target.checked)}
              className="rounded border-zinc-400"
            />
            Stealth mode
          </label>
          <label className="flex items-center gap-2 font-sans text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={useProxy}
              onChange={(e) => setUseProxy(e.target.checked)}
              className="rounded border-zinc-400"
            />
            Proxy
          </label>
          <label className="flex items-center gap-2 font-sans text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={solveCaptchas}
              onChange={(e) => setSolveCaptchas(e.target.checked)}
              className="rounded border-zinc-400"
            />
            Solve CAPTCHAs
          </label>
          <label className="block">
            <span className="font-sans text-xs text-zinc-600">Agent model</span>
            <select
              value={agentLlm}
              onChange={(e) => setAgentLlm(e.target.value as BrowserUseLlm)}
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-sans text-xs text-zinc-950 shadow-sm"
            >
              {LLMS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
