"use client";

import { AlertCircle } from "lucide-react";

import { ArtifactPanel } from "@/components/artifact-panel";
import { CrawlFeed } from "@/components/crawl-feed";
import { SiteMapGraph } from "@/components/site-map-graph";
import { UrlForm } from "@/components/url-form";
import { useMapStream } from "@/lib/use-map-stream";

export default function Home() {
  const {
    artifact,
    errors,
    feed,
    graphEdges,
    graphPages,
    running,
    start,
    status,
    stop,
  } = useMapStream();

  return (
    <main className="h-screen overflow-hidden bg-[var(--background)] px-4 py-4 text-[var(--foreground)] md:px-6">
      <div className="mx-auto grid h-full max-w-[96rem] grid-rows-[auto_auto_minmax(0,1fr)] gap-4">
        <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-[var(--subtle)]">
              Powered by Hyperbrowser
            </p>
            <h1 className="font-heading mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              Agent-ready site maps.
            </h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">
            Enter a URL and watch Hyperbrowser crawl the site, extract concise
            page data, draw link flows, and produce a structured JSON artifact
            an AI agent can load later without re-crawling.
          </p>
        </header>

        <UrlForm running={running} onStart={start} onStop={stop} />

        {errors.length > 0 ? (
          <div className="grid gap-2 border border-[var(--border)] p-4">
            {errors.map((error, index) => (
              <div
                key={`${error}-${index}`}
                className="flex items-start gap-3 text-sm text-[var(--muted)]"
              >
                <AlertCircle className="mt-0.5 shrink-0" size={16} />
                <span>{error}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid min-h-0 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="grid min-h-0 min-w-0 gap-4 lg:grid-rows-2">
            <CrawlFeed items={feed} status={status} />
            <ArtifactPanel artifact={artifact} compact />
          </div>
          <SiteMapGraph pages={graphPages} edges={graphEdges} />
        </div>
      </div>
    </main>
  );
}
