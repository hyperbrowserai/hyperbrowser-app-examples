"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { SwarmConfig } from "@/components/SwarmConfig";
import type { BrowserUseLlm } from "@hyperbrowser/sdk/types";

const PLACEHOLDERS = [
  "Find me the best laptop under $1,200 for video editing",
  "Research everything I need to open a coffee shop in Portland",
  "Compare Supabase vs Firebase vs Neon for my next project",
  "Find a 2-bedroom apartment in Brooklyn under $2,800",
];

type Props = {
  onLaunch: (goal: string) => void;
  disabled: boolean;
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

export function LandingInput({
  onLaunch,
  disabled,
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
  const [value, setValue] = useState("");
  const [phIndex, setPhIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPhIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center bg-white px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-10"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo className="h-12 w-auto text-zinc-950" decorative />
          <h1 className="font-sans text-2xl font-normal tracking-tight text-zinc-950 md:text-3xl">
            HYPERSWARM
          </h1>
          <p className="max-w-md font-sans text-sm text-zinc-600">
            Type a goal. Watch the swarm work.
          </p>
        </div>
        <form
          className="flex flex-col gap-4 sm:flex-row sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault();
            const g = value.trim();
            if (g.length >= 4) onLaunch(g);
          }}
        >
          <label className="sr-only" htmlFor="goal-input">
            Goal
          </label>
          <input
            id="goal-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={PLACEHOLDERS[phIndex]}
            disabled={disabled}
            className="min-h-12 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-sans text-sm text-zinc-950 placeholder:text-zinc-400 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || value.trim().length < 4}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-zinc-950 bg-zinc-950 px-6 font-sans text-xs font-normal text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Launch swarm
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </form>
        <SwarmConfig
          maxAgents={maxAgents}
          setMaxAgents={setMaxAgents}
          maxSteps={maxSteps}
          setMaxSteps={setMaxSteps}
          timeoutSeconds={timeoutSeconds}
          setTimeoutSeconds={setTimeoutSeconds}
          useStealth={useStealth}
          setUseStealth={setUseStealth}
          useProxy={useProxy}
          setUseProxy={setUseProxy}
          solveCaptchas={solveCaptchas}
          setSolveCaptchas={setSolveCaptchas}
          agentLlm={agentLlm}
          setAgentLlm={setAgentLlm}
        />
        <p className="text-center font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Powered by Hyperbrowser
        </p>
      </motion.div>
    </div>
  );
}
