import {
  AlertTriangle,
  BarChart3,
  Brain,
  Braces,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  Layers3,
  Megaphone,
  Network,
  Palette,
  Quote,
  RadioTower,
  Route,
  Search,
  ShieldCheck,
  Target,
  Timer,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { SourceIcon } from "@/components/SourceIcon";
import type { MineRunEvent } from "@/lib/run-events";
import type {
  AnalysisMode,
  GrowthChannel,
  MineResult,
  PainCluster,
  PainSignal,
  SignalScore,
  SignalSource,
  Urgency,
} from "@/lib/types";

type ResultsDashboardProps = {
  result: MineResult;
  isLoading?: boolean;
  activeRun?: {
    query: string;
    sources: SignalSource[];
    analysisMode: AnalysisMode;
    maxResults: number;
    includeBroadWeb: boolean;
    redditTargets: string[];
  };
  runEvents?: MineRunEvent[];
};

/* Color mappings */

const sourceLabels: Record<SignalSource, string> = {
  hackernews: "HN",
  github: "GitHub",
  reddit: "Reddit",
  hyperbrowser: "Hyperbrowser",
};

const sourceLongLabels: Record<SignalSource, string> = {
  hackernews: "HN Enrichment API",
  github: "GitHub Enrichment API",
  reddit: "Reddit target",
  hyperbrowser: "Hyperbrowser Search + Fetch",
};

const sourceTextClass: Record<SignalSource, string> = {
  hackernews: "text-source-hn",
  github: "text-source-github",
  reddit: "text-source-reddit",
  hyperbrowser: "text-source-web",
};

const sourceDotClass: Record<SignalSource, string> = {
  hackernews: "bg-source-hn",
  github: "bg-source-github",
  reddit: "bg-source-reddit",
  hyperbrowser: "bg-source-web",
};

const sourceBadgeClass: Record<SignalSource, string> = {
  hackernews: "border-source-hn/30 bg-source-hn/12 text-source-hn",
  github: "border-source-github/30 bg-source-github/12 text-source-github",
  reddit: "border-source-reddit/30 bg-source-reddit/12 text-source-reddit",
  hyperbrowser: "border-source-web/30 bg-source-web/12 text-source-web",
};

const channelLabels: Record<GrowthChannel, string> = {
  content: "Content",
  outbound: "Outbound",
  community: "Community",
  "landing-page": "Landing page",
};

const channelBadgeClass: Record<GrowthChannel, string> = {
  content: "border-accent-blue/40 bg-accent-blue/15 text-accent-blue",
  outbound: "border-accent-orange/40 bg-accent-orange/15 text-accent-orange",
  community: "border-accent-purple/40 bg-accent-purple/15 text-accent-purple",
  "landing-page": "border-accent/40 bg-accent/15 text-accent",
};

const urgencyBadgeClass: Record<Urgency, string> = {
  high: "border-urgency-high/40 bg-urgency-high/15 text-urgency-high",
  medium: "border-urgency-med/40 bg-urgency-med/15 text-urgency-med",
  low: "border-urgency-low/40 bg-urgency-low/15 text-urgency-low",
};

/* Main Dashboard */

export function ResultsDashboard({
  result,
  isLoading = false,
  activeRun,
  runEvents = [],
}: ResultsDashboardProps) {
  const brief = result.brief;
  const scoreBySignalId = new Map(
    (result.signalScores ?? []).map((score) => [score.signalId, score])
  );
  const sourceMix = brief?.sourceMix.length
    ? brief.sourceMix
    : Array.from(new Set(result.signals.map((s) => s.source))).map(
        (source) => ({
          source,
          count: result.signals.filter((s) => s.source === source).length,
        })
      );
  const totalSignals = sourceMix.reduce((sum, s) => sum + s.count, 0);

  return (
    <section className={`space-y-4 ${isLoading ? "opacity-70" : ""}`}>
      {/* Metrics Strip */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line/70 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCell
          icon={<RadioTower size={13} className="text-accent" />}
          label="Data Mode"
          value={result.metadata.analysisMode}
          valueClass="text-accent"
          detail={
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              <span className="text-success">{result.metadata.effectiveAnalysisMode}</span>
            </span>
          }
        />
        <MetricCell
          icon={<ShieldCheck size={13} className="text-accent-blue" />}
          label="Confidence"
          value={brief?.confidence ?? "low"}
          valueClass={
            brief?.confidence === "high"
              ? "text-success"
              : brief?.confidence === "medium"
                ? "text-accent-orange"
                : "text-urgency-high"
          }
          detail={
            <span className="flex flex-wrap gap-x-3">
              {sourceMix.map((item) => (
                <span key={item.source} className="flex items-center gap-1">
                  <span
                    className={`size-2 rounded-full ${sourceDotClass[item.source]}`}
                  />
                  <span className={`font-semibold ${sourceTextClass[item.source]}`}>
                    {sourceLabels[item.source]}
                  </span>{" "}
                  <span className="text-muted">
                    {totalSignals
                      ? `${Math.round((item.count / totalSignals) * 100)}%`
                      : item.count}
                  </span>
                </span>
              ))}
            </span>
          }
        />
        <MetricCell
          icon={<BarChart3 size={13} className="text-accent-blue" />}
          label="Signals"
          value={String(result.signals.length)}
          valueClass="text-accent-blue"
        />
        <MetricCell
          icon={<Layers3 size={13} className="text-accent-purple" />}
          label="Clusters"
          value={String(result.clusters.length)}
          valueClass="text-accent-purple"
        />
        <MetricCell
          icon={<Zap size={13} className="text-accent-orange" />}
          label="Growth Plays"
          value={String(result.growthPlays.length)}
          valueClass="text-accent-orange"
        />
        <MetricCell
          icon={<Clock3 size={13} className="text-muted" />}
          label="Last Run"
          value={formatTimingShort(result.metadata.timings)}
          valueClass="text-foreground"
          detail={formatTimestamp(result.generatedAt)}
        />
      </div>

      <RunTrace
        result={result}
        isLoading={isLoading}
        activeRun={activeRun}
        runEvents={runEvents}
      />

      {/* Three-Column Content Grid */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.22fr)_minmax(0,1fr)]">
        {/* Column 1: Growth Brief */}
        <Panel
          icon={<Target size={15} className="text-accent" />}
          title="Growth Brief"
          accentColor="border-t-accent"
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-accent">
                Top Finding
              </p>
              <h2 className="mt-2 text-base font-black leading-snug tracking-tight text-foreground">
                {brief?.topFinding ?? "No strong finding yet."}
              </h2>
            </div>

            <p className="text-sm leading-6 text-muted">
              {brief?.executiveSummary ??
                "HyperGrowth will summarize clusters and expected-value growth plays here."}
            </p>

            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-source-web/25 bg-source-web/8 px-2.5 py-1 text-xs font-semibold text-source-web">
              <SourceIcon source="hyperbrowser" size={12} />
              Hyperbrowser discovery and page fetch, enriched by selected APIs
            </p>

            <div className="rounded-md border border-accent/25 bg-accent/8 px-3 py-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-accent">
                Recommended Next Step
              </p>
              <p className="mt-1.5 text-sm leading-6 text-foreground">
                {brief?.recommendedNextStep ??
                  "Run a live query to generate a recommended next step."}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {sourceMix.map((item) => (
                <span
                  key={item.source}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${sourceBadgeClass[item.source]}`}
                >
                  <span className={`size-1.5 rounded-full ${sourceDotClass[item.source]}`} />
                  {sourceLabels[item.source]} {item.count}
                </span>
              ))}
              {brief?.caveats.slice(0, 2).map((caveat) => (
                <span
                  key={caveat}
                  className="inline-flex max-w-full items-center truncate rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-bold uppercase text-warning"
                >
                  {caveat}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        {/* Column 2: Ranked Growth Plays */}
        <Panel
          icon={<Megaphone size={15} className="text-accent-orange" />}
          title="Ranked Growth Plays"
          accentColor="border-t-accent-orange"
          headerRight={
            result.growthPlays.length > 0 ? (
              <span className="text-xs font-semibold text-muted">
                Showing {Math.min(result.growthPlays.length, 6)} of{" "}
                {result.growthPlays.length}
              </span>
            ) : undefined
          }
        >
          {result.growthPlays.length ? (
            <div className="space-y-0">
              {result.growthPlays.slice(0, 6).map((play, index) => (
                <div
                  key={play.id}
                  className="flex items-center gap-3 border-b border-line/40 px-1 py-3 transition last:border-b-0 hover:bg-white/[0.02]"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded text-xs font-black text-accent-orange">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                      {play.title}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${channelBadgeClass[play.channel]}`}
                  >
                    {channelLabels[play.channel]}
                  </span>
                  <span className="shrink-0 text-right text-xs font-mono text-muted">
                    {play.supportingSignalIds.length}
                    <span className="ml-0.5 text-xs text-muted/60">ev</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No growth plays were generated." />
          )}
        </Panel>

        {/* Column 3: Pain Clusters */}
        <Panel
          icon={<Layers3 size={15} className="text-accent-purple" />}
          title="Pain Clusters"
          accentColor="border-t-accent-purple"
          headerRight={
            result.clusters.length > 0 ? (
              <span className="text-xs font-semibold text-muted">
                Showing {Math.min(result.clusters.length, 5)} of{" "}
                {result.clusters.length}
              </span>
            ) : undefined
          }
        >
          {result.clusters.length ? (
            <div className="space-y-0">
              {/* Table header */}
              <div className="flex items-center gap-2 border-b border-line/50 pb-2 text-xs font-bold uppercase tracking-wide text-muted">
                <span className="w-5" />
                <span className="min-w-0 flex-1">Cluster</span>
                <span className="w-16 text-center">Urgency</span>
                <span className="w-10 text-center">Src</span>
                <span className="w-24 text-right">Tools</span>
              </div>
              {result.clusters.slice(0, 5).map((cluster, index) => (
                <ClusterRow
                  key={cluster.id}
                  cluster={cluster}
                  index={index + 1}
                />
              ))}
            </div>
          ) : (
            <EmptyState text="No clusters were produced." />
          )}
        </Panel>
      </div>

      <BrowserEvidence result={result} />

      {/* Evidence Table */}
      <EvidenceTable signals={result.signals} scoreMap={scoreBySignalId} />

      {/* Diagnostics Console */}
      <Diagnostics result={result} />
    </section>
  );
}

function RunTrace({
  result,
  isLoading,
  activeRun,
  runEvents,
}: {
  result: MineResult;
  isLoading: boolean;
  activeRun?: ResultsDashboardProps["activeRun"];
  runEvents: MineRunEvent[];
}) {
  if (runEvents.length) {
    return (
      <LiveRunTrace
        events={runEvents}
        isLoading={isLoading}
        activeRun={activeRun}
      />
    );
  }

  const plan = result.metadata.queryPlan;
  const searches = result.metadata.searchDiagnostics ?? [];
  const executedSearches = result.metadata.executedSearches ?? [];
  const visibleQueries = plan
    ? Object.entries(plan.sourceQueries).flatMap(([source, queries]) =>
        queries.map((query) => ({
          source: source as SignalSource,
          query,
          reason: "expanded" as const,
        }))
      )
    : executedSearches.map((search) => ({
        source: search.source,
        query: search.query,
        reason: search.reason,
      }));
  const llm = result.metadata.llm;
  const waves =
    plan?.waves?.length
      ? plan.waves
      : visibleQueries.length
        ? [
            {
              index: 1,
              reason: "Executed source-specific discovery and enrichment.",
              searches: visibleQueries,
            },
          ]
        : [];

  if (isLoading) {
    return (
      <Panel
        icon={<Route size={15} className="text-accent-blue" />}
        title="Research Trace"
        accentColor="border-t-accent-blue"
        headerRight={
          <span className="text-xs font-semibold text-accent-blue">
            Hyperbrowser-first run
          </span>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <div className="rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Active request
            </p>
            <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-6 text-foreground">
              {activeRun?.query ?? result.query}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(activeRun?.sources ?? result.metadata.searchedSources).map(
                (source) => (
                  <span
                    key={source}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${sourceBadgeClass[source]}`}
                  >
                    <SourceIcon source={source} size={12} />
                    {sourceLongLabels[source]}
                  </span>
                )
              )}
            </div>
            {activeRun?.redditTargets.length ? (
              <p className="mt-2 text-xs leading-5 text-muted">
                Reddit targets via Hyperbrowser:{" "}
                {activeRun.redditTargets.map((target) => `r/${target}`).join(", ")}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {loadingPhases.map((phase, index) => (
              <div
                key={phase.label}
                className="rounded-md border border-line/50 bg-black/20 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                  {index === 0 ? (
                    <span className="size-2 rounded-full bg-accent animate-pulse" />
                  ) : (
                    <span className="size-2 rounded-full bg-muted/50" />
                  )}
                  {phase.label}
                </span>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {phase.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    );
  }

  if (!plan && !searches.length && !executedSearches.length) {
    return null;
  }

  return (
    <Panel
      icon={<Route size={15} className="text-accent-blue" />}
      title="Research Trace"
      accentColor="border-t-accent-blue"
      headerRight={
        <span className="text-xs font-semibold text-muted">
          Final metadata
        </span>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
            <Search size={12} className="text-accent-blue" />
            Research Waves
          </div>
          <div className="mt-3 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {plan ? (
              <span className="inline-flex rounded-full border border-accent-blue/30 bg-accent-blue/10 px-2.5 py-1 text-xs font-semibold text-accent-blue">
                {formatStrategy(plan.strategy)}
              </span>
            ) : null}
            {waves.map((wave) => (
              <div
                key={wave.index}
                className="rounded-md border border-line/45 bg-white/[0.025] px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">
                    Wave {wave.index}
                  </p>
                  <span className="text-xs text-muted">
                    {wave.searches.length} searches
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {wave.reason}
                </p>
                <div className="mt-2 grid gap-1.5 md:grid-cols-2">
                  {wave.searches.map((item) => (
                    <span
                      key={`${wave.index}-${item.source}-${item.query}`}
                      className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${sourceBadgeClass[item.source]}`}
                      title={item.query}
                    >
                      <SourceIcon source={item.source} size={12} />
                      <span className="min-w-0 truncate">{item.query}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {plan?.stopReason ? (
            <p className="mt-3 rounded-md border border-accent/20 bg-accent/8 px-3 py-2 text-xs leading-5 text-muted">
              {plan.stopReason}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4">
        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
            <Network size={12} className="text-accent-orange" />
            Discovery & Enrichment
          </div>
          <div className="mt-2 max-h-[18rem] space-y-1.5 overflow-y-auto pr-1">
            {searches.length ? (
              searches.map((search) => (
                <div
                  key={`${search.source}-${search.query}`}
                  className="flex items-start justify-between gap-3 border-b border-line/40 py-1.5 last:border-b-0"
                >
                  <span className="flex min-w-0 items-start gap-1.5">
                    <SourceIcon source={search.source} size={12} />
                    <span
                      className={`min-w-0 text-xs font-semibold leading-4 ${sourceTextClass[search.source]}`}
                    >
                      {sourceLongLabels[search.source]}
                      <span className="block truncate font-normal text-muted">
                        {search.query}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    {formatCandidateCounts(search)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-2 text-xs text-muted">
                No source diagnostics were returned.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
            <Brain size={12} className="text-accent-purple" />
            Intelligence
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <TraceMode label="Queries" value={llm.queryExpansionMode} />
            <TraceMode label="Triage" value={llm.candidateTriageMode} />
            <TraceMode label="Pages" value={llm.pageTriageMode} />
            <TraceMode label="Extract" value={llm.evidenceExtractionMode} />
            <TraceMode label="Gaps" value={llm.gapExpansionMode} />
            <TraceMode label="Judge" value={llm.judgmentMode} />
            <TraceMode label="Brief" value={llm.synthesisMode} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <Timer size={11} />
            {formatTimingShort(result.metadata.timings)} total,{" "}
            {llm.callsAttempted} LLM calls attempted
          </p>
        </div>
        </div>
      </div>
    </Panel>
  );
}

function LiveRunTrace({
  events,
  isLoading,
  activeRun,
}: {
  events: MineRunEvent[];
  isLoading: boolean;
  activeRun?: ResultsDashboardProps["activeRun"];
}) {
  const phases = events.filter((event) => event.type === "phase_started");
  const searches = events.filter((event) => event.type === "search_query");
  const sourceResults = events.filter((event) => event.type === "source_result");
  const llmSteps = events.filter((event) => event.type === "llm_step");
  const rejected = events.filter((event) => event.type === "candidate_rejected");
  const accepted = events.filter((event) => event.type === "evidence_accepted");
  const clusters = events.filter((event) => event.type === "cluster_created");
  const plays = events.filter((event) => event.type === "play_created");
  const failed = events.find((event) => event.type === "run_failed");
  const latestPhase = [...phases].pop();

  return (
    <Panel
      icon={<Route size={15} className="text-accent-blue" />}
      title="Live Research Trace"
      accentColor={failed ? "border-t-danger" : "border-t-accent-blue"}
      headerRight={
        <span
          className={`text-xs font-semibold ${
            failed ? "text-danger" : isLoading ? "text-accent-blue" : "text-success"
          }`}
        >
          {failed ? "Failed" : isLoading ? "Streaming" : "Complete"}
        </span>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
              <Route size={12} className="text-accent-blue" />
              Current Phase
            </span>
            {isLoading ? (
              <span className="size-2 rounded-full bg-accent animate-pulse" />
            ) : null}
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {latestPhase?.label ?? "Starting run"}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
            {activeRun?.query ?? "Waiting for request details."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {phases.slice(-6).map((phase, index) => (
              <span
                key={`${phase.phase}-${index}`}
                className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-2.5 py-1 text-xs font-semibold text-accent-blue"
              >
                {phase.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
            <Search size={12} className="text-accent-orange" />
            Discovery & Enrichment
          </div>
          <div className="mt-2 max-h-[18rem] space-y-1.5 overflow-y-auto pr-1">
            {sourceResults.length ? (
              sourceResults.map((event, index) => (
                <div
                  key={`${event.source}-${event.query}-${index}`}
                  className="flex items-start justify-between gap-3 border-b border-line/40 py-1.5 last:border-b-0"
                >
                  <span className="flex min-w-0 items-start gap-1.5">
                    <SourceIcon source={event.source} size={12} />
                    <span
                      className={`min-w-0 truncate text-xs font-semibold leading-4 ${sourceTextClass[event.source]}`}
                    >
                      {event.query}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-xs ${
                      event.status === "success" ? "text-muted" : "text-danger"
                    }`}
                  >
                    {event.status === "success"
                      ? `${event.raw} raw`
                      : "failed"}
                  </span>
                </div>
              ))
            ) : (
              searches.map((event, index) => (
                <div
                  key={`${event.source}-${event.query}-${index}`}
                  className="flex items-center gap-1.5 border-b border-line/40 py-1.5 text-xs last:border-b-0"
                >
                  <SourceIcon source={event.source} size={12} />
                  <span className="truncate text-muted">{event.query}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
            <Brain size={12} className="text-accent-purple" />
            Intelligence
          </div>
          <div className="mt-2 space-y-1.5">
            {llmSteps.slice(-6).map((event, index) => (
              <div
                key={`${event.step}-${index}`}
                className="border-b border-line/40 py-1.5 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    {formatIntelligenceStep(event.step)}
                  </span>
                  <span className="font-mono text-muted">
                    {formatTraceMode(event.mode)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">
                  {event.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TraceCount
          label="Accepted evidence"
          value={accepted.length}
          tone="success"
        />
        <TraceCount label="Rejected candidates" value={rejected.length} tone="warning" />
        <TraceCount label="Clusters" value={clusters.length} tone="purple" />
        <TraceCount label="Growth plays" value={plays.length} tone="orange" />
      </div>

      {accepted.length ? (
        <div className="mt-4 rounded-md border border-line/50 bg-black/20 px-3 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
            <Quote size={12} className="text-accent-blue" />
            Latest accepted evidence
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {accepted.slice(-4).map((event, index) => (
              <div
                key={`${event.source}-${event.title}-${index}`}
                className="border-l-2 border-l-accent-blue bg-white/[0.02] px-3 py-2"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <SourceIcon source={event.source} size={11} />
                  {event.title}
                </span>
                <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-foreground/90">
                  &ldquo;{event.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {failed ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-danger/25 bg-danger/8 px-3 py-2 text-xs text-danger">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" />
          {failed.message}
        </div>
      ) : null}
    </Panel>
  );
}

function TraceCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "purple" | "orange";
}) {
  const toneClass = {
    success: "text-success border-success/25 bg-success/8",
    warning: "text-warning border-warning/25 bg-warning/8",
    purple: "text-accent-purple border-accent-purple/25 bg-accent-purple/8",
    orange: "text-accent-orange border-accent-orange/25 bg-accent-orange/8",
  }[tone];

  return (
    <div className={`rounded-md border px-3 py-2.5 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

const loadingPhases = [
  {
    label: "Planning research",
    detail: "Creating Hyperbrowser-first discovery queries from the request.",
  },
  {
    label: "Discovering pages",
    detail: "Searching the open web with Hyperbrowser before API enrichment.",
  },
  {
    label: "Fetching pages",
    detail: "Reading selected URLs with Hyperbrowser Fetch for full-page context.",
  },
  {
    label: "Enriching APIs",
    detail: "Corroborating with Hacker News and GitHub where selected.",
  },
  {
    label: "Judging evidence",
    detail: "Filtering weak pages, ads, login walls, and low-overlap snippets.",
  },
  {
    label: "Building plays",
    detail: "Clustering pain signals and preparing the growth brief.",
  },
];

function TraceMode({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  const mode = value ?? "disabled";
  const labelValue = formatTraceMode(mode);
  const modeClass =
    mode === "used" || mode === "deterministic"
      ? "text-success"
      : mode === "fallback" || mode === "partial"
        ? "text-warning"
        : "text-muted";

  return (
    <span className="flex items-center justify-between gap-2 border-b border-line/30 py-0.5 last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className={`font-mono font-semibold ${modeClass}`}>{labelValue}</span>
    </span>
  );
}

function formatStrategy(strategy: string): string {
  return strategy.replaceAll("-", " ");
}

function formatIntelligenceStep(step: string): string {
  const labels: Record<string, string> = {
    query_expansion: "Research plan",
    candidate_triage: "Fetch selection",
    page_triage: "Page triage",
    evidence_extraction: "Evidence judgment",
    gap_expansion: "Expansion plan",
    judgment: "Signal scoring",
    synthesis: "Growth synthesis",
  };

  return labels[step] ?? formatStrategy(step);
}

function formatTraceMode(mode: string): string {
  if (mode === "partial") {
    return "hybrid";
  }

  if (mode === "deterministic") {
    return "deterministic";
  }

  return mode;
}

function getEvidenceTrail(signal: PainSignal): string {
  if (signal.source === "hyperbrowser") {
    return "Discovered and fetched by Hyperbrowser";
  }

  if (signal.source === "hackernews") {
    return "Hyperbrowser-led research, enriched by HN";
  }

  if (signal.source === "github") {
    return "Hyperbrowser-led research, enriched by GitHub";
  }

  return "Community signal enrichment";
}

function formatCandidateCounts(search: {
  status: "success" | "error";
  rawSignals: number;
  acceptedCandidates?: number;
  rejectedCandidates?: number;
}) {
  if (search.status === "error") {
    return "error";
  }

  const accepted = search.acceptedCandidates;
  const rejected = search.rejectedCandidates;
  if (typeof accepted === "number" || typeof rejected === "number") {
    return `${search.rawSignals} raw / ${accepted ?? 0} accepted / ${rejected ?? 0} rejected`;
  }

  return `${search.rawSignals} raw`;
}

function BrowserEvidence({ result }: { result: MineResult }) {
  const run = result.metadata.hyperbrowserRun;

  if (!run || (!run.searches.length && !run.fetches.length)) {
    return null;
  }

  return (
    <Panel
      icon={<RadioTower size={15} className="text-source-web" />}
      title="Browser Evidence"
      accentColor="border-t-source-web"
      headerRight={
        <span className="text-xs font-semibold text-muted">
          {run.discoveredResultCount} discovered, {run.fetchedPageCount} fetched
        </span>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.55fr)]">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <BrowserStat
              label="Searches"
              value={run.searches.length}
              tone="web"
            />
            <BrowserStat
              label="Accepted"
              value={run.acceptedEvidenceCount}
              tone="success"
            />
            <BrowserStat
              label="Rejected"
              value={run.rejectedCandidateCount}
              tone="warning"
            />
          </div>

          <div className="rounded-md border border-line/50 bg-black/20 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-muted">
              <span className="flex items-center gap-1.5">
                <Search size={12} className="text-source-web" />
                Hyperbrowser Search
              </span>
              <span className="font-mono text-muted">
                {run.settings.timeoutMs}ms
              </span>
            </div>
            <div className="max-h-[17rem] space-y-1.5 overflow-y-auto pr-1">
              {run.searches.map((search) => (
                <div
                  key={`${search.query}-${search.reason}`}
                  className="rounded border border-line/40 bg-white/[0.025] px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-xs font-semibold leading-5 text-foreground">
                      {search.query}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-xs font-bold ${
                        search.status === "success"
                          ? "border-success/25 bg-success/8 text-success"
                          : "border-danger/25 bg-danger/8 text-danger"
                      }`}
                    >
                      {search.status}
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{search.resultCount} results</span>
                    <span>{search.durationMs}ms</span>
                    <span>{search.reason}</span>
                  </p>
                  {search.error ? (
                    <p className="mt-1 line-clamp-2 text-xs text-danger">
                      {search.error}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
              <FileText size={12} className="text-source-web" />
              Hyperbrowser Fetch
            </span>
            <span className="rounded-full border border-source-web/25 bg-source-web/10 px-2.5 py-1 text-xs font-semibold text-source-web">
              outputs: {run.settings.fetchOutputFormats.join(", ")}
            </span>
          </div>

          {run.fetches.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {run.fetches.map((fetch) => (
                <div
                  key={`${fetch.candidateId}-${fetch.url}`}
                  className="rounded-md border border-line/45 bg-white/[0.025] px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={fetch.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex max-w-full items-center gap-1.5 text-sm font-bold leading-5 text-foreground hover:text-source-web"
                      >
                        <span className="min-w-0 truncate">
                          {fetch.title || formatUrlHost(fetch.url)}
                        </span>
                        <ExternalLink
                          size={12}
                          className="shrink-0 text-muted group-hover:text-source-web"
                        />
                      </a>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {formatUrlHost(fetch.url)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-xs font-black uppercase ${
                        fetch.status === "success"
                          ? fetch.evidenceAccepted
                            ? "border-success/25 bg-success/8 text-success"
                            : "border-warning/25 bg-warning/8 text-warning"
                          : "border-danger/25 bg-danger/8 text-danger"
                      }`}
                    >
                      {fetch.status === "success"
                        ? fetch.evidenceAccepted
                          ? "accepted"
                          : "reviewed"
                        : fetch.status}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded border border-source-web/20 bg-source-web/8 px-1.5 py-0.5 font-mono text-source-web">
                      {fetch.markdownLength.toLocaleString()} chars
                    </span>
                    <span className="rounded border border-source-web/20 bg-source-web/8 px-1.5 py-0.5 font-mono text-source-web">
                      {fetch.linkCount} links
                    </span>
                    {fetch.richFetchStatus ? (
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono ${
                          fetch.richFetchStatus === "used"
                            ? "border-success/25 bg-success/8 text-success"
                            : fetch.richFetchStatus === "fallback"
                              ? "border-warning/25 bg-warning/8 text-warning"
                              : "border-line/40 bg-black/20 text-muted"
                        }`}
                      >
                        {fetch.richFetchStatus === "used"
                          ? "rich fetch"
                          : fetch.richFetchStatus}
                      </span>
                    ) : null}
                    {fetch.screenshot ? (
                      <span className="inline-flex items-center gap-1 rounded border border-accent-blue/25 bg-accent-blue/8 px-1.5 py-0.5 font-mono text-accent-blue">
                        <ImageIcon size={10} />
                        screenshot {formatBytes(fetch.screenshot.byteLength)}
                      </span>
                    ) : null}
                    {fetch.stealth ? (
                      <span className="rounded border border-accent-purple/25 bg-accent-purple/8 px-1.5 py-0.5 font-mono text-accent-purple">
                        stealth {fetch.stealth}
                      </span>
                    ) : null}
                    {fetch.qualityFlags.map((flag) => (
                      <span
                        key={flag}
                        className="rounded border border-warning/25 bg-warning/8 px-1.5 py-0.5 text-warning"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>

                  {fetch.screenshot ? (
                    <div className="mt-2 overflow-hidden rounded border border-line/40 bg-black/25">
                      <div
                        aria-hidden="true"
                        className="h-32 w-full bg-cover bg-top"
                        style={{
                          backgroundImage: `url("${formatScreenshotSrc(fetch.screenshot.src)}")`,
                        }}
                      />
                    </div>
                  ) : null}

                  {fetch.pageSummary ? (
                    <div className="mt-2 rounded border border-accent-blue/20 bg-accent-blue/8 px-2 py-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5 font-bold text-accent-blue">
                        <Braces size={11} />
                        <span>{fetch.pageSummary.pageType ?? "page summary"}</span>
                        {fetch.pageSummary.mainTopic ? (
                          <span className="font-normal text-muted">
                            {fetch.pageSummary.mainTopic}
                          </span>
                        ) : null}
                      </div>
                      {fetch.pageSummary.evidenceValue ? (
                        <p className="mt-1 line-clamp-2 leading-5 text-foreground/85">
                          {fetch.pageSummary.evidenceValue}
                        </p>
                      ) : null}
                      {fetch.pageSummary.painSignals?.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {fetch.pageSummary.painSignals.slice(0, 3).map((signal) => (
                            <span
                              key={signal}
                              className="max-w-full truncate rounded-full border border-accent-blue/20 bg-black/20 px-2 py-0.5 text-muted"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {fetch.branding ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded border border-accent-purple/20 bg-accent-purple/8 px-2 py-1.5 text-xs text-accent-purple">
                      <Palette size={11} />
                      {fetch.branding.primaryColor ? (
                        <span
                          className="size-3 rounded-full border border-white/30"
                          style={{ backgroundColor: fetch.branding.primaryColor }}
                          title={`Primary ${fetch.branding.primaryColor}`}
                        />
                      ) : null}
                      {fetch.branding.accentColor ? (
                        <span
                          className="size-3 rounded-full border border-white/30"
                          style={{ backgroundColor: fetch.branding.accentColor }}
                          title={`Accent ${fetch.branding.accentColor}`}
                        />
                      ) : null}
                      <span className="truncate">
                        {fetch.branding.tone ??
                          fetch.branding.colorScheme ??
                          "branding captured"}
                      </span>
                    </div>
                  ) : null}

                  {fetch.pageTriage ? (
                    <div className="mt-2 rounded border border-line/40 bg-black/20 px-2 py-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 font-black uppercase ${
                            fetch.pageTriage.decision === "accept"
                              ? "border-success/25 bg-success/8 text-success"
                              : fetch.pageTriage.decision === "needs_more_context"
                                ? "border-accent-orange/25 bg-accent-orange/8 text-accent-orange"
                                : "border-danger/25 bg-danger/8 text-danger"
                          }`}
                        >
                          LLM {fetch.pageTriage.decision.replaceAll("_", " ")}
                        </span>
                        <span className="font-mono text-muted">
                          conf {formatPercent(fetch.pageTriage.confidence)}
                          {" / "}
                          fit {formatPercent(fetch.pageTriage.hyperbrowserFit)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {fetch.pageTriage.pageType ? (
                          <span className="rounded-full border border-line/40 bg-white/[0.025] px-2 py-0.5 text-muted">
                            {fetch.pageTriage.pageType}
                          </span>
                        ) : null}
                        {fetch.pageTriage.painCategory ? (
                          <span className="rounded-full border border-accent-blue/20 bg-accent-blue/8 px-2 py-0.5 text-accent-blue">
                            {fetch.pageTriage.painCategory.replaceAll("_", " ")}
                          </span>
                        ) : null}
                        {fetch.pageTriage.artifactSignals.map((artifact) => (
                          <span
                            key={artifact}
                            className="rounded-full border border-source-web/20 bg-source-web/8 px-2 py-0.5 text-source-web"
                          >
                            {artifact}
                          </span>
                        ))}
                      </div>
                      {fetch.pageTriage.reasoning.length ? (
                        <p className="mt-1.5 line-clamp-2 leading-5 text-foreground/85">
                          {fetch.pageTriage.reasoning.join(" ")}
                        </p>
                      ) : null}
                      {fetch.pageTriage.evidenceQuote ? (
                        <p className="mt-1.5 border-l-2 border-l-success bg-success/5 px-2 py-1.5 leading-5 text-foreground/90">
                          &ldquo;{fetch.pageTriage.evidenceQuote}&rdquo;
                        </p>
                      ) : null}
                      {fetch.pageTriage.rejectionReason ? (
                        <p className="mt-1.5 line-clamp-2 leading-5 text-danger">
                          {fetch.pageTriage.rejectionReason}
                        </p>
                      ) : null}
                      {fetch.pageTriage.followUpSearches.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {fetch.pageTriage.followUpSearches.map((search) => (
                            <span
                              key={search}
                              className="max-w-full truncate rounded-full border border-accent-orange/25 bg-accent-orange/8 px-2 py-0.5 text-accent-orange"
                            >
                              {search}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {fetch.acceptedQuote ? (
                    <p className="mt-2 border-l-2 border-l-success bg-success/5 px-2 py-1.5 text-xs leading-5 text-foreground/90">
                      &ldquo;{fetch.acceptedQuote}&rdquo;
                    </p>
                  ) : fetch.error ? (
                    <p className="mt-2 line-clamp-3 rounded border border-danger/20 bg-danger/8 px-2 py-1.5 text-xs leading-5 text-danger">
                      {fetch.error}
                    </p>
                  ) : (
                    <p className="mt-2 line-clamp-3 rounded border border-line/30 bg-black/20 px-2 py-1.5 text-xs leading-5 text-muted">
                      {fetch.richFetchError
                        ? `Rich artifacts fell back: ${fetch.richFetchError}`
                        : fetch.markdownPreview || "No markdown text returned."}
                    </p>
                  )}

                  {fetch.links.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fetch.links.slice(0, 4).map((link) => (
                        <span
                          key={link}
                          title={link}
                          className="max-w-full truncate rounded-full border border-line/40 bg-black/20 px-2 py-0.5 text-xs text-muted"
                        >
                          {formatUrlHost(link)}
                        </span>
                      ))}
                      {fetch.links.length > 4 ? (
                        <span className="rounded-full border border-line/40 px-2 py-0.5 text-xs text-muted">
                          +{fetch.links.length - 4}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No pages were selected for Hyperbrowser Fetch." />
          )}
        </div>
      </div>
    </Panel>
  );
}

function BrowserStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "web" | "success" | "warning";
}) {
  const toneClass = {
    web: "border-source-web/25 bg-source-web/8 text-source-web",
    success: "border-success/25 bg-success/8 text-success",
    warning: "border-warning/25 bg-warning/8 text-warning",
  }[tone];

  return (
    <div className={`rounded-md border px-3 py-2.5 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

/* Evidence Table */

function EvidenceTable({
  signals,
  scoreMap,
}: {
  signals: PainSignal[];
  scoreMap: Map<string, SignalScore>;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel/70 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/50 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Quote size={14} className="text-accent-blue" />
          <span>Evidence</span>
          <span className="font-mono text-xs font-normal text-muted">
            (Quote-First)
          </span>
        </span>
        {signals.length > 0 ? (
          <span className="text-xs font-semibold text-accent-blue">
            Showing all {signals.length}
          </span>
        ) : null}
      </div>

      {signals.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-line/50 text-xs font-bold uppercase tracking-wide text-muted">
                <th className="w-1 py-2 pl-0 pr-0 font-bold" />
                <th className="px-3 py-2 font-bold">Quote</th>
                <th className="px-3 py-2 font-bold">Source</th>
                <th className="px-3 py-2 font-bold">Type</th>
                <th className="px-3 py-2 font-bold">Score</th>
                <th className="py-2 pl-3 pr-4 font-bold">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => {
                const score = scoreMap.get(signal.id);
                return (
                  <EvidenceRow
                    key={signal.id}
                    signal={signal}
                    score={score}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-6">
          <EmptyState text="No evidence quotes are available." />
        </div>
      )}
    </div>
  );
}

function EvidenceRow({
  signal,
  score,
}: {
  signal: PainSignal;
  score?: SignalScore;
}) {
  const borderColor =
    signal.source === "hackernews"
      ? "border-l-source-hn"
      : signal.source === "github"
        ? "border-l-source-github"
        : signal.source === "reddit"
          ? "border-l-source-reddit"
          : "border-l-source-web";

  return (
    <tr
      className={`border-b border-line/30 transition last:border-b-0 hover:bg-white/[0.025] border-l-2 ${borderColor}`}
    >
      {/* Colored left stripe is handled by border-l */}
      <td className="w-1 py-3 pl-0 pr-0" />

      {/* Quote text */}
      <td className="max-w-[560px] px-4 py-4 align-top">
        <a
          href={signal.url}
          target="_blank"
          rel="noreferrer"
          className="group block"
          title={signal.title}
        >
          <p className="line-clamp-4 text-sm leading-6 text-foreground/90 transition group-hover:text-accent-blue">
            &ldquo;{signal.quote}&rdquo;
          </p>
        </a>
      </td>

      {/* Source + date */}
      <td className="whitespace-nowrap px-3 py-4 align-top">
        <a
          href={signal.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 transition hover:opacity-85"
          title={`Open ${sourceLabels[signal.source]} source`}
        >
          <SourceIcon source={signal.source} size={14} />
          <span
            className={`text-sm font-bold ${sourceTextClass[signal.source]}`}
          >
            {sourceLabels[signal.source]}
          </span>
          <ExternalLink size={10} className="text-muted" />
        </a>
        {signal.publishedAt ? (
          <p className="mt-1 text-xs text-muted">
            {formatDate(signal.publishedAt)}
          </p>
        ) : null}
      </td>

      {/* Type */}
      <td className="px-3 py-4 align-top">
        <span className="rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-xs font-semibold capitalize text-muted">
          {signal.evidenceKind ?? "signal"}
        </span>
        <p className="mt-1.5 max-w-[180px] whitespace-normal text-xs leading-4 text-muted/75">
          {getEvidenceTrail(signal)}
        </p>
      </td>

      {/* Score */}
      <td className="px-3 py-4 align-top">
        {score ? (
          <span
            className={`font-mono text-base font-black ${
              score.total >= 0.8
                ? "text-accent"
                : score.total >= 0.6
                  ? "text-accent-orange"
                  : "text-urgency-high"
            }`}
          >
            {score.total.toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-muted">-</span>
        )}
      </td>

      {/* Rationale */}
      <td className="max-w-[360px] py-4 pl-3 pr-4 align-top">
        <div className="space-y-2">
          {score?.reasons.length ? (
            <p className="line-clamp-3 text-sm leading-5 text-muted">
              {score.reasons.join(". ")}
            </p>
          ) : null}
          <a
            className="inline-flex items-center gap-1 text-sm font-semibold text-accent-blue transition hover:underline"
            href={signal.url}
            target="_blank"
            rel="noreferrer"
          >
            Open source <ExternalLink size={10} />
          </a>
        </div>
      </td>
    </tr>
  );
}

/* Cluster Row */

function ClusterRow({
  cluster,
  index,
}: {
  cluster: PainCluster;
  index: number;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-line/40 py-3 transition last:border-b-0 hover:bg-white/[0.02]">
      <span className="w-5 text-center text-xs font-bold text-accent-purple">
        {index}
      </span>
      <span className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-5 text-foreground">
        {cluster.title}
      </span>
      <span className="w-16 text-center">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold capitalize ${urgencyBadgeClass[cluster.urgency]}`}
        >
          {cluster.urgency}
        </span>
      </span>
      <span className="w-10 text-center text-xs font-mono text-accent-purple">
        {cluster.sourceDiversity ?? 1}/{cluster.signalIds.length > 3 ? 3 : cluster.signalIds.length}
      </span>
      <span className="flex w-24 justify-end gap-1 overflow-hidden">
        {cluster.relatedTools.slice(0, 2).map((tool) => (
          <span
            key={tool}
            className="truncate rounded border border-accent-purple/20 bg-accent-purple/8 px-1.5 py-0.5 text-xs font-semibold text-accent-purple/80"
          >
            {tool}
          </span>
        ))}
        {cluster.relatedTools.length > 2 ? (
          <span className="rounded border border-accent-purple/20 bg-accent-purple/8 px-1 py-0.5 text-xs text-accent-purple/60">
            +{cluster.relatedTools.length - 2}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/* Diagnostics Console */

function Diagnostics({ result }: { result: MineResult }) {
  const timings = result.metadata.timings ?? [];
  const searches = result.metadata.searchDiagnostics ?? [];
  const sourceDebug = result.metadata.sourceDebug ?? [];
  const plan = result.metadata.queryPlan;
  const totalRaw = sourceDebug.reduce(
    (sum, debug) => sum + debug.rawCandidates,
    0
  );
  const totalQualityAccepted = sourceDebug.reduce(
    (sum, debug) => sum + debug.qualityAccepted,
    0
  );
  const totalQualityRejected = sourceDebug.reduce(
    (sum, debug) => sum + debug.qualityRejected,
    0
  );
  const totalEvidence = sourceDebug.reduce(
    (sum, debug) => sum + debug.evidenceAccepted,
    0
  );
  const totalFinal = sourceDebug.reduce(
    (sum, debug) => sum + debug.finalSignals,
    0
  );
  const llmStatus = result.metadata.llm.failureReason
    ? "issue"
    : result.metadata.llm.callsAttempted > 0
      ? "used"
      : "not used";
  const warnings = [
    ...result.metadata.errors,
    ...result.metadata.notes.filter(
      (n) =>
        n.toLowerCase().includes("rejected") ||
        n.toLowerCase().includes("warning")
    ),
  ];

  return (
    <details className="group rounded-lg border border-line bg-panel/70 backdrop-blur-xl">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Braces size={14} className="text-accent-purple" />
          Diagnostics Console
        </span>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {timings.length > 0 && (
            <span className="text-xs text-muted">
              Total:{" "}
              <span className="font-mono font-bold text-accent-blue">
                {timings.find((t) => t.name === "total")?.durationMs ?? "-"}ms
              </span>
            </span>
          )}
          {result.metadata.llm.model && (
            <span className="text-xs text-muted">
              Model:{" "}
              <span className="font-semibold text-accent-purple">
                {result.metadata.llm.model}
              </span>
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
              <AlertTriangle size={10} /> {warnings.length}
            </span>
          )}
          <ChevronDown
            size={14}
            className="text-muted transition group-open:rotate-180"
          />
        </div>
      </summary>

      <div className="border-t border-line/50 px-4 py-3">
        <div className="grid gap-3 text-xs lg:grid-cols-2 xl:grid-cols-3">
          <DiagnosticBlock
            title="Research Budget"
            icon={<Route size={12} className="text-accent-blue" />}
          >
            <DiagnosticLine
              label="Waves"
              value={plan?.waves?.length ?? (searches.length ? 1 : 0)}
              valueClass="text-accent-blue"
            />
            <DiagnosticLine
              label="Searches"
              value={searches.length}
              valueClass="text-foreground"
            />
            <DiagnosticLine
              label="Max results"
              value={result.signals.length}
              valueClass="text-accent"
            />
            {plan?.stopReason ? (
              <p className="mt-2 line-clamp-3 border-t border-line/40 pt-2 text-xs leading-5 text-muted">
                {plan.stopReason}
              </p>
            ) : null}
          </DiagnosticBlock>

          <DiagnosticBlock
            title="Source Coverage"
            icon={<Network size={12} className="text-accent-orange" />}
          >
            {sourceDebug.length ? (
              sourceDebug.map((debug) => (
                <DiagnosticLine
                  key={debug.source}
                  label={sourceLabels[debug.source]}
                  value={`${debug.rawCandidates} raw -> ${debug.finalSignals} final`}
                  valueClass={sourceTextClass[debug.source]}
                />
              ))
            ) : (
              <p className="text-muted">No source coverage in demo.</p>
            )}
          </DiagnosticBlock>

          <DiagnosticBlock
            title="Quality Flow"
            icon={<ShieldCheck size={12} className="text-success" />}
          >
            <DiagnosticLine label="Raw" value={totalRaw} />
            <DiagnosticLine
              label="Accepted / rejected"
              value={`${totalQualityAccepted} / ${totalQualityRejected}`}
              valueClass="text-warning"
            />
            <DiagnosticLine
              label="Evidence"
              value={totalEvidence}
              valueClass="text-accent-blue"
            />
            <DiagnosticLine
              label="Final"
              value={totalFinal}
              valueClass="text-accent"
            />
          </DiagnosticBlock>

          {/* Timings */}
          <DiagnosticBlock
            title="Timings"
            icon={<Clock3 size={12} className="text-accent-blue" />}
          >
            {timings.length ? (
              timings.map((t) => (
                <DiagnosticLine
                  key={t.name}
                  label={t.name}
                  value={`${t.durationMs}ms`}
                  valueClass={t.name === "total" ? "text-accent-blue font-bold" : "text-foreground"}
                />
              ))
            ) : (
              <p className="text-muted">No timings in demo mode.</p>
            )}
          </DiagnosticBlock>

          {/* LLM Status */}
          <DiagnosticBlock
            title="LLM Status"
            icon={<Brain size={12} className="text-accent-purple" />}
            titleRight={
              <span className="flex items-center gap-1 text-xs">
                <span
                  className={`size-2 rounded-full ${
                    llmStatus === "issue"
                      ? "bg-danger"
                      : llmStatus === "used"
                        ? "bg-success"
                        : "bg-muted"
                  }`}
                />
                <span
                  className={`font-bold ${
                    llmStatus === "issue"
                      ? "text-danger"
                      : llmStatus === "used"
                        ? "text-success"
                        : "text-muted"
                  }`}
                >
                  {llmStatus}
                </span>
              </span>
            }
          >
            <DiagnosticLine
              label="Model"
              value={result.metadata.llm.model ?? "-"}
              valueClass="text-accent-purple"
            />
            <DiagnosticLine
              label="Mode"
              value={result.metadata.effectiveAnalysisMode}
            />
            <DiagnosticLine
              label="Calls"
              value={result.metadata.llm.callsAttempted}
            />
            <DiagnosticLine
              label="Gap expansion"
              value={formatTraceMode(
                result.metadata.llm.gapExpansionMode ?? "disabled"
              )}
              valueClass={
                result.metadata.llm.gapExpansionMode === "used"
                  || result.metadata.llm.gapExpansionMode === "deterministic"
                  ? "text-success"
                  : "text-muted"
              }
            />
          </DiagnosticBlock>

          {/* Warnings */}
          <DiagnosticBlock
            title="Warnings"
            icon={<AlertTriangle size={12} className="text-warning" />}
            titleRight={
              warnings.length > 0 ? (
                <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-xs font-black text-warning">
                  {warnings.length}
                </span>
              ) : undefined
            }
          >
            {warnings.length ? (
              warnings.slice(0, 3).map((w) => (
                <p
                  key={w}
                  className="flex gap-1.5 border-b border-line/40 py-1.5 text-xs leading-5 text-warning/80 last:border-b-0"
                >
                  <TriangleAlert size={10} className="mt-0.5 shrink-0" /> {w}
                </p>
              ))
            ) : (
              <p className="flex items-center gap-1 text-success">
                <CheckCircle2 size={11} /> No warnings
              </p>
            )}
          </DiagnosticBlock>

        </div>

        {sourceDebug.length ? (
          <div className="mt-3 rounded-md border border-line/50 bg-black/20 px-3 py-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
                <Network size={12} className="text-accent-blue" />
                Research Funnel Debug
              </span>
              <span className="text-xs text-muted">
                discovery to fetch to enrichment to evidence
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line/50 text-xs font-black uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Source</th>
                    <th className="px-3 py-2">Raw</th>
                    <th className="px-3 py-2">Quality</th>
                    <th className="px-3 py-2">Evidence</th>
                    <th className="px-3 py-2">Final</th>
                    <th className="px-3 py-2">Reject Flags</th>
                    <th className="py-2 pl-3">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceDebug.map((debug) => (
                    <tr
                      key={debug.source}
                      className="border-b border-line/30 last:border-b-0"
                    >
                      <td className="py-2 pr-3 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 font-bold ${sourceTextClass[debug.source]}`}
                        >
                          <SourceIcon source={debug.source} size={13} />
                          {sourceLabels[debug.source]}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top font-mono text-foreground">
                        {debug.rawCandidates}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="font-mono text-success">
                          {debug.qualityAccepted}
                        </span>
                        <span className="mx-1 text-muted">/</span>
                        <span className="font-mono text-warning">
                          {debug.qualityRejected}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top font-mono text-accent-blue">
                        {debug.evidenceAccepted}
                      </td>
                      <td className="px-3 py-2 align-top font-mono text-accent">
                        {debug.finalSignals}
                      </td>
                      <td className="max-w-[240px] px-3 py-2 align-top">
                        {Object.entries(debug.rejectionFlags).length ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(debug.rejectionFlags).map(
                              ([flag, count]) => (
                                <span
                                  key={flag}
                                  className="rounded-full border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-xs font-semibold text-warning"
                                >
                                  {flag}: {count}
                                </span>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">none</span>
                        )}
                      </td>
                      <td className="max-w-[360px] py-2 pl-3 align-top">
                        {debug.sampleRejected.length ? (
                          <div className="space-y-1">
                            {debug.sampleRejected.map((sample) => (
                              <p
                                key={`${sample.title}-${sample.flags.join(",")}`}
                                className="line-clamp-1 text-xs text-muted"
                                title={`${sample.title} (${sample.flags.join(", ")})`}
                              >
                                rejected: {sample.title}
                              </p>
                            ))}
                          </div>
                        ) : debug.sampleAcceptedTitles.length ? (
                          <div className="space-y-1">
                            {debug.sampleAcceptedTitles.map((title) => (
                              <p
                                key={title}
                                className="line-clamp-1 text-xs text-muted"
                                title={title}
                              >
                                accepted: {title}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">no samples</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Quality shows accepted/rejected before LLM judgment. Evidence is
              quote extraction output. Final is normalized evidence used by the
              dashboard.
            </p>
          </div>
        ) : null}

        {/* LLM Failure details */}
        {result.metadata.llm.failureReason ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-danger/25 bg-danger/8 px-3 py-2 text-xs text-danger">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {result.metadata.llm.failureReason}
          </div>
        ) : null}
      </div>
    </details>
  );
}

/* Shared Small Components */

function MetricCell({
  icon,
  label,
  value,
  detail,
  valueClass = "text-foreground",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center bg-panel/70 px-4 py-3">
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </span>
      <p
        className={`mt-1.5 text-xl font-black capitalize tracking-tight ${valueClass}`}
      >
        {value}
      </p>
      {detail ? (
        <span className="mt-1 text-xs text-muted">{detail}</span>
      ) : null}
    </div>
  );
}

function Panel({
  icon,
  title,
  headerRight,
  accentColor = "border-t-accent",
  children,
}: {
  icon: ReactNode;
  title: string;
  headerRight?: ReactNode;
  accentColor?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border border-line border-t-2 ${accentColor} bg-panel/70 shadow-[0_12px_48px_rgba(0,0,0,0.2)] backdrop-blur-xl`}
    >
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-line/50 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
          {icon}
          {title}
        </span>
        {headerRight}
      </div>
      <div className="flex-1 px-4 py-4">{children}</div>
    </div>
  );
}

function DiagnosticBlock({
  title,
  icon,
  titleRight,
  children,
}: {
  title: string;
  icon: ReactNode;
  titleRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-line/50 bg-black/20 px-3 py-3">
      <div className="mb-2.5 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-muted">
        <span className="flex items-center gap-1.5">
          {icon}
          {title}
        </span>
        {titleRight}
      </div>
      {children}
    </div>
  );
}

function DiagnosticLine({
  label,
  value,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/40 py-1.5 text-xs last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${valueClass}`}>{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-line/50 bg-black/12 p-4 text-center text-sm text-muted">
      <FileText className="mx-auto mb-1.5 text-muted/50" size={15} />
      {text}
    </div>
  );
}

/* Helpers */

function formatTimingShort(
  timings?: { name: string; durationMs: number }[]
): string {
  if (!timings?.length) return "-";
  const total = timings.find((t) => t.name === "total");
  if (!total) return "-";
  return total.durationMs < 1000
    ? `${total.durationMs}ms`
    : `${(total.durationMs / 1000).toFixed(1)}s`;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatUrlHost(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatScreenshotSrc(src: string): string {
  if (/^(data:image\/|https?:\/\/)/i.test(src)) {
    return src;
  }

  return `data:image/webp;base64,${src}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
