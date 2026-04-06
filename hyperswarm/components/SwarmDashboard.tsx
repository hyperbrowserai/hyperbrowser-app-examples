"use client";

import { useSwarm } from "@/hooks/useSwarm";
import { motion } from "framer-motion";
import { AgentGrid } from "@/components/AgentGrid";
import { LandingInput } from "@/components/LandingInput";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SynthesisView } from "@/components/SynthesisView";
import { TopBar } from "@/components/TopBar";
import type { RankedResult, SwarmSynthesis } from "@/lib/types";
import { Loader2 } from "lucide-react";

function buildMarkdown(goal: string, syn: SwarmSynthesis, ranked: RankedResult[]) {
  const lines = [
    `# HyperSwarm results`,
    ``,
    `**Goal:** ${goal}`,
    ``,
    `## Summary`,
    syn.headline,
    ``,
    syn.recommendation,
    ``,
    `## Ranked results`,
    ...ranked.map(
      (r) =>
        `### ${r.rank}. ${r.title}\n${r.keyData}\n*Sources:* ${r.sources.join(", ")}\n${r.summary}\n`,
    ),
  ];
  return lines.join("\n");
}

export function SwarmDashboard() {
  const swarm = useSwarm();

  const handleCopy = () => {
    if (!swarm.synthesis) return;
    const md = buildMarkdown(
      swarm.goal,
      swarm.synthesis,
      swarm.rankedResults,
    );
    void navigator.clipboard.writeText(md);
  };

  const handleDownload = () => {
    if (!swarm.synthesis) return;
    const md = buildMarkdown(
      swarm.goal,
      swarm.synthesis,
      swarm.rankedResults,
    );
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hyperswarm-results.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!swarm.synthesis) return;
    const text = `${swarm.synthesis.headline}\n\n${swarm.synthesis.recommendation}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "HyperSwarm", text });
      } catch {
        void navigator.clipboard.writeText(text);
      }
    } else {
      void navigator.clipboard.writeText(text);
    }
  };

  if (swarm.swarmPhase === "idle") {
    return (
      <LandingInput
        onLaunch={(g) => void swarm.runDecomposeAndLaunch(g)}
        disabled={false}
        maxAgents={swarm.maxAgents}
        setMaxAgents={swarm.setMaxAgents}
        maxSteps={swarm.maxSteps}
        setMaxSteps={swarm.setMaxSteps}
        timeoutSeconds={swarm.timeoutSeconds}
        setTimeoutSeconds={swarm.setTimeoutSeconds}
        useStealth={swarm.useStealth}
        setUseStealth={swarm.setUseStealth}
        useProxy={swarm.useProxy}
        setUseProxy={swarm.setUseProxy}
        solveCaptchas={swarm.solveCaptchas}
        setSolveCaptchas={swarm.setSolveCaptchas}
        agentLlm={swarm.agentLlm}
        setAgentLlm={swarm.setAgentLlm}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-950">
      <TopBar
        goal={swarm.goal}
        activeCount={swarm.activeCount}
        totalAgents={swarm.agents.length}
        resultsCount={swarm.rankedResults.length}
        swarmPhase={swarm.swarmPhase}
        onStop={() => void swarm.stopSwarm()}
        onNewSwarm={() => swarm.reset()}
      />
      {swarm.error ? (
        <div className="mx-auto max-w-[1800px] px-4 py-3 font-sans text-sm text-red-600 md:px-8">
          {swarm.error}
        </div>
      ) : null}
      <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-8 px-4 py-8 lg:flex-row lg:px-8">
        <div className="min-w-0 flex-1 space-y-8">
          {swarm.swarmPhase === "decomposing" && swarm.agents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 font-sans text-sm text-zinc-600"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Breaking down your goal
            </motion.div>
          ) : null}
          {swarm.agents.length > 0 ? <AgentGrid agents={swarm.agents} /> : null}
        </div>
        <div className="w-full shrink-0 lg:w-[380px] xl:w-[420px]">
          {swarm.synthesis ? (
            <SynthesisView
              synthesis={swarm.synthesis}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          ) : null}
          <ResultsPanel results={swarm.rankedResults} />
        </div>
      </div>
      <footer className="border-t border-zinc-200 py-6 text-center font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        Powered by Hyperbrowser
      </footer>
    </div>
  );
}
