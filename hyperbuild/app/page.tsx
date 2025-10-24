import Link from "next/link";
import templates from "@/public/templates.json";
import { Icons } from "@/lib/icons";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="HyperBuild" className="w-6 h-6" />
            <h1 className="text-xl font-semibold tracking-tight">HyperBuild</h1>
          </div>
          <Link href="/builder" className="px-3 py-1 rounded bg-[#F0FF26] text-black font-medium flex items-center gap-2 font-mono text-xs">
            <Icons.Builder className="w-4 h-4" />
            <span>Open Builder</span>
          </Link>
        </header>
       
        <p className="text-sm text-neutral-400 mt-3 font-mono">Pick a starter template to get started quickly.</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-neutral-500 font-mono">Powered by</span>
          <a href="https://hyperbrowser.ai" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <img src="/wordmark.svg" alt="Hyperbrowser" className="h-3" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {(templates as Array<{ id: string; name: string; description: string; [key: string]: unknown }>).map((t) => (
            <div
              key={t.id}
              className="relative group rounded-2xl p-6 border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/80 hover:border-neutral-700 transition-all duration-300 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(0,255,136,0.05)] hover:border-[#00FF88]/10"
            >
              {/* Header with icon */}
              <div className="mb-6">
                <div className="p-3 rounded-2xl bg-neutral-800/50 border border-neutral-700/50 w-fit">
                  {t.id === "web-data-enricher" && <Icons.Scrape className="w-6 h-6 text-white" />}
                  {t.id === "market-trend-planner" && <Icons.LLM className="w-6 h-6 text-white" />}
                  {t.id === "dynamic-faq-agent" && <Icons.QnAGenerator className="w-6 h-6 text-white" />}
                  {t.id === "web-dataset-qa" && <Icons.Extract className="w-6 h-6 text-white" />}
                  {t.id === "web-version-comparator" && <Icons.Transform className="w-6 h-6 text-white" />}
                  {t.id === "web-knowledge-monitor" && <Icons.Crawl className="w-6 h-6 text-white" />}
                </div>
              </div>

              {/* Template info */}
              <div className="mb-6">
                <div className="text-xs text-neutral-500 font-mono mb-1">Template-{String((templates as unknown[]).indexOf(t) + 1).padStart(2, '0')}</div>
                <h3 className="text-xl font-semibold mb-3 leading-tight">{t.name}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed font-mono">
                  {t.description.toUpperCase()}
                </p>
              </div>

              {/* Tags */}
              <div className="flex gap-2 mb-8">
                <span className="px-2.5 py-1 rounded-md bg-neutral-800/50 border border-neutral-700/50 text-xs font-mono">
                  {t.id.includes('scrape') || t.id.includes('data') ? 'DATA' : 
                   t.id.includes('llm') || t.id.includes('trend') ? 'AI' : 
                   t.id.includes('qa') || t.id.includes('faq') ? 'Q&A' : 'AUTOMATION'}
                </span>
              </div>

              {/* Bottom section */}
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="text-white font-semibold">Free</div>
                  <div className="text-xs text-neutral-500 font-mono">Per use</div>
                </div>
                <Link
                  href={{ pathname: "/builder", query: { template: t.id } }}
                  className="px-6 py-2.5 rounded-lg bg-neutral-200 text-black font-medium hover:bg-neutral-300 transition-all duration-300 text-sm font-mono"
                >
                  USE NOW
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
