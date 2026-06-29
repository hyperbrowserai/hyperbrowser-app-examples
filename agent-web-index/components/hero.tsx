import { MODELS, MODEL_LABELS } from "@/lib/types";
import { asciiBar, pct } from "@/lib/format";
import type { Site } from "@/lib/types";
import { HyperbrowserLogo, ZaiLogo } from "@/components/brand-logos";

export default function Hero({ sites }: { sites: Site[] }) {
  const hasData = sites.length > 0;
  const hardest = hasData
    ? [...sites].sort((a, b) => b.difficulty - a.difficulty)[0]
    : null;
  const modelAverages = MODELS.map((model) => {
    const average =
      sites.reduce((sum, site) => sum + site.results[model].successRate, 0) /
      Math.max(sites.length, 1);
    return { model, average };
  }).sort((a, b) => b.average - a.average);
  const leader = modelAverages[0];

  return (
    <header className="pt-12 pb-10 sm:pt-16">
      <div className="flex items-center gap-5 mb-12 text-black">
        <ZaiLogo />
        <span className="font-mono text-lg text-gray-400 select-none">+</span>
        <HyperbrowserLogo />
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter lowercase leading-[0.95] mb-5">
        agent web index
      </h1>
      <p className="text-lg sm:text-xl font-semibold text-gray-500 max-w-2xl leading-snug mb-9">
        we put glm-5.2 in a hyperbrowser cloud browser and sent it at real
        sites against closed frontier models. same browser. same tasks. same
        text-only view of the web.
      </p>

      <div className="max-w-3xl border-4 border-black shadow-brutal-lg bg-white">
        <div className="grid sm:grid-cols-3 border-b-4 border-black">
          <ExperimentTile
            label="browser"
            value="hyperbrowser"
            detail="real cloud sessions, proxy, stealth, captcha support"
          />
          <ExperimentTile
            label="open model"
            value="glm-5.2"
            detail="called through the configured z.ai-compatible endpoint"
          />
          <ExperimentTile
            label="closed models"
            value="claude + gpt"
            detail="same text-dom observation, same action loop"
          />
        </div>
        {hasData && hardest && leader ? (
          <div className="bg-black text-white p-5 font-mono">
            <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">
              latest real benchmark
            </div>
            <div className="flex items-end justify-between gap-5 flex-wrap">
              <div>
                <div className="text-4xl font-bold leading-none">
                  {hardest.difficulty}
                  <span className="text-base text-gray-400 font-semibold">/100</span>
                </div>
                <div className="mt-1.5 text-sm text-gray-300 lowercase">
                  hardest measured site: {hardest.label}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm lowercase text-gray-300">
                  top average: {MODEL_LABELS[leader.model]} at {pct(leader.average)}
                </div>
                <div className="mt-1 text-xs tracking-[2px] text-gray-500">
                  {asciiBar(hardest.difficulty, 18)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-black text-white p-5 font-mono">
            <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">
              ready to run
            </div>
            <div className="text-sm text-gray-200 lowercase leading-relaxed max-w-2xl">
              paste a supported url below and click run site. the leaderboard
              and replay fill in from the real browser sessions — nothing is
              preloaded or estimated.
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function ExperimentTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="p-4 sm:border-r-4 sm:last:border-r-0 border-black border-b-4 sm:border-b-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-2">
        {label}
      </div>
      <div className="text-xl font-extrabold tracking-tight lowercase mb-1">
        {value}
      </div>
      <div className="font-mono text-[11px] leading-snug text-gray-500 lowercase">
        {detail}
      </div>
    </div>
  );
}
