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
  Layers3,
  Megaphone,
  Network,
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
    <section className={`space-y-3 ${isLoading ? "opacity-70" : ""}`}>
      {/* Metrics Strip */}
      <div className="flex items-stretch overflow-x-auto rounded-lg border border-line bg-panel/70 backdrop-blur-xl">
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
        <MetricDivider />
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
        <MetricDivider />
        <MetricCell
          icon={<BarChart3 size={13} className="text-accent-blue" />}
          label="Signals"
          value={String(result.signals.length)}
          valueClass="text-accent-blue"
        />
        <MetricDivider />
        <MetricCell
          icon={<Layers3 size={13} className="text-accent-purple" />}
          label="Clusters"
          value={String(result.clusters.length)}
          valueClass="text-accent-purple"
        />
        <MetricDivider />
        <MetricCell
          icon={<Zap size={13} className="text-accent-orange" />}
          label="Growth Plays"
          value={String(result.growthPlays.length)}
          valueClass="text-accent-orange"
        />
        <MetricDivider />
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
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Column 1: Growth Brief */}
        <Panel
          icon={<Target size={15} className="text-accent" />}
          title="Growth Brief"
          accentColor="border-t-accent"
        >
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Top Finding
              </p>
              <h2 className="mt-1.5 text-[12px] font-black leading-snug tracking-tight text-foreground">
                {brief?.topFinding ?? "No strong finding yet."}
              </h2>
            </div>

            <p className="text-[12px] leading-5 text-muted">
              {brief?.executiveSummary ??
                "HyperGrowth will summarize clusters and expected-value growth plays here."}
            </p>

            <p className="inline-flex items-center gap-1.5 rounded-full border border-source-web/25 bg-source-web/8 px-2 py-1 text-[10px] font-semibold text-source-web">
              <SourceIcon source="hyperbrowser" size={12} />
              Hyperbrowser discovery and page fetch, enriched by selected APIs
            </p>

            <div className="rounded-md border border-accent/25 bg-accent/8 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Recommended Next Step
              </p>
              <p className="mt-1 text-[12px] leading-5 text-foreground">
                {brief?.recommendedNextStep ??
                  "Run a live query to generate a recommended next step."}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {sourceMix.map((item) => (
                <span
                  key={item.source}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${sourceBadgeClass[item.source]}`}
                >
                  <span className={`size-1.5 rounded-full ${sourceDotClass[item.source]}`} />
                  {sourceLabels[item.source]} {item.count}
                </span>
              ))}
              {brief?.caveats.slice(0, 2).map((caveat) => (
                <span
                  key={caveat}
                  className="inline-flex max-w-full items-center truncate rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase text-warning"
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
              <span className="text-[11px] font-semibold text-muted">
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
                  className="flex items-center gap-3 border-b border-line/40 px-1 py-2.5 last:border-b-0 hover:bg-white/[0.02] transition"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded text-[11px] font-black text-accent-orange">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {play.title}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${channelBadgeClass[play.channel]}`}
                  >
                    {channelLabels[play.channel]}
                  </span>
                  <span className="shrink-0 text-right text-[11px] font-mono text-muted">
                    {play.supportingSignalIds.length}
                    <span className="ml-0.5 text-[9px] text-muted/60">ev</span>
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
              <span className="text-[11px] font-semibold text-muted">
                Showing {Math.min(result.clusters.length, 5)} of{" "}
                {result.clusters.length}
              </span>
            ) : undefined
          }
        >
          {result.clusters.length ? (
            <div className="space-y-0">
              {/* Table header */}
              <div className="flex items-center gap-2 border-b border-line/50 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
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
        }))
      )
    : executedSearches.map((search) => ({
        source: search.source,
        query: search.query,
      }));
  const llm = result.metadata.llm;

  if (isLoading) {
    return (
      <Panel
        icon={<Route size={15} className="text-accent-blue" />}
        title="Research Trace"
        accentColor="border-t-accent-blue"
        headerRight={
          <span className="text-[11px] font-semibold text-accent-blue">
            Hyperbrowser-first run
          </span>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <div className="rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Active request
            </p>
            <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-foreground">
              {activeRun?.query ?? result.query}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(activeRun?.sources ?? result.metadata.searchedSources).map(
                (source) => (
                  <span
                    key={source}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sourceBadgeClass[source]}`}
                  >
                    <SourceIcon source={source} size={12} />
                    {sourceLongLabels[source]}
                  </span>
                )
              )}
            </div>
            {activeRun?.redditTargets.length ? (
              <p className="mt-2 text-[10px] leading-4 text-muted">
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
                <span className="flex items-center gap-2 text-[11px] font-bold text-foreground">
                  {index === 0 ? (
                    <span className="size-2 rounded-full bg-accent animate-pulse" />
                  ) : (
                    <span className="size-2 rounded-full bg-muted/50" />
                  )}
                  {phase.label}
                </span>
                <p className="mt-1 text-[10px] leading-4 text-muted">
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
        <span className="text-[11px] font-semibold text-muted">
          Final metadata
        </span>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
            <Search size={12} className="text-accent-blue" />
            Discovery Plan
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan ? (
              <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-2 py-0.5 text-[10px] font-semibold text-accent-blue">
                {formatStrategy(plan.strategy)}
              </span>
            ) : null}
            {visibleQueries.slice(0, 8).map((item) => (
              <span
                key={`${item.source}-${item.query}`}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sourceBadgeClass[item.source]}`}
                title={item.query}
              >
                <SourceIcon source={item.source} size={11} />
                <span className="max-w-[220px] truncate">{item.query}</span>
              </span>
            ))}
          </div>
          {plan?.rationale.length ? (
            <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted">
              {plan.rationale.join(" ")}
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
            <Network size={12} className="text-accent-orange" />
            Discovery & Enrichment
          </div>
          <div className="mt-1.5 space-y-1">
            {searches.length ? (
              searches.slice(0, 5).map((search) => (
                <div
                  key={`${search.source}-${search.query}`}
                  className="flex items-center justify-between gap-2 border-b border-line/40 py-1 last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <SourceIcon source={search.source} size={12} />
                    <span
                      className={`truncate text-[11px] font-semibold ${sourceTextClass[search.source]}`}
                    >
                      {sourceLongLabels[search.source]}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-muted">
                    {formatCandidateCounts(search)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-2 text-[11px] text-muted">
                No source diagnostics were returned.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
            <Brain size={12} className="text-accent-purple" />
            Intelligence
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <TraceMode label="Queries" value={llm.queryExpansionMode} />
            <TraceMode label="Triage" value={llm.candidateTriageMode} />
            <TraceMode label="Extract" value={llm.evidenceExtractionMode} />
            <TraceMode label="Gaps" value={llm.gapExpansionMode} />
            <TraceMode label="Judge" value={llm.judgmentMode} />
            <TraceMode label="Brief" value={llm.synthesisMode} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
            <Timer size={11} />
            {formatTimingShort(result.metadata.timings)} total,{" "}
            {llm.callsAttempted} LLM calls attempted
          </p>
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
          className={`text-[11px] font-semibold ${
            failed ? "text-danger" : isLoading ? "text-accent-blue" : "text-success"
          }`}
        >
          {failed ? "Failed" : isLoading ? "Streaming" : "Complete"}
        </span>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
              <Route size={12} className="text-accent-blue" />
              Current Phase
            </span>
            {isLoading ? (
              <span className="size-2 rounded-full bg-accent animate-pulse" />
            ) : null}
          </div>
          <p className="mt-2 text-[12px] font-semibold text-foreground">
            {latestPhase?.label ?? "Starting run"}
          </p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">
            {activeRun?.query ?? "Waiting for request details."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {phases.slice(-6).map((phase, index) => (
              <span
                key={`${phase.phase}-${index}`}
                className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-2 py-0.5 text-[10px] font-semibold text-accent-blue"
              >
                {phase.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
            <Search size={12} className="text-accent-orange" />
            Discovery & Enrichment
          </div>
          <div className="mt-1.5 space-y-1">
            {sourceResults.length ? (
              sourceResults.slice(-5).map((event, index) => (
                <div
                  key={`${event.source}-${event.query}-${index}`}
                  className="flex items-center justify-between gap-2 border-b border-line/40 py-1 last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <SourceIcon source={event.source} size={12} />
                    <span
                      className={`truncate text-[11px] font-semibold ${sourceTextClass[event.source]}`}
                    >
                      {event.query}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[10px] ${
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
              searches.slice(-5).map((event, index) => (
                <div
                  key={`${event.source}-${event.query}-${index}`}
                  className="flex items-center gap-1.5 border-b border-line/40 py-1 text-[11px] last:border-b-0"
                >
                  <SourceIcon source={event.source} size={12} />
                  <span className="truncate text-muted">{event.query}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
            <Brain size={12} className="text-accent-purple" />
            Intelligence
          </div>
          <div className="mt-1.5 space-y-1">
            {llmSteps.slice(-6).map((event, index) => (
              <div
                key={`${event.step}-${index}`}
                className="border-b border-line/40 py-1 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-semibold text-foreground">
                    {formatIntelligenceStep(event.step)}
                  </span>
                  <span className="font-mono text-muted">
                    {formatTraceMode(event.mode)}
                  </span>
                </div>
                <p className="line-clamp-1 text-[10px] text-muted">
                  {event.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-4">
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
        <div className="mt-3 rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
            <Quote size={12} className="text-accent-blue" />
            Latest accepted evidence
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {accepted.slice(-4).map((event, index) => (
              <div
                key={`${event.source}-${event.title}-${index}`}
                className="border-l-2 border-l-accent-blue bg-white/[0.02] px-2 py-1.5"
              >
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                  <SourceIcon source={event.source} size={11} />
                  {event.title}
                </span>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-foreground/90">
                  &ldquo;{event.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {failed ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-danger/25 bg-danger/8 px-3 py-2 text-[11px] text-danger">
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
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-1 text-[16px] font-black">{value}</p>
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
    mode === "used"
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

function formatSearchStatus(search: {
  status: "success" | "error";
  acceptedCandidates?: number;
}) {
  if (search.status === "error") {
    return "failed";
  }

  if (search.acceptedCandidates === 0) {
    return "0 accepted";
  }

  return "completed";
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
      <div className="flex items-center justify-between border-b border-line/50 px-4 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-black uppercase tracking-wide">
          <Quote size={14} className="text-accent-blue" />
          <span>Evidence</span>
          <span className="font-mono text-[11px] font-normal text-muted">
            (Quote-First)
          </span>
        </span>
        {signals.length > 0 ? (
          <span className="text-[11px] font-semibold text-accent-blue">
            Showing first {Math.min(signals.length, 6)} of {signals.length}
          </span>
        ) : null}
      </div>

      {signals.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-line/50 text-[10px] font-bold uppercase tracking-wider text-muted">
                <th className="w-1 py-2 pl-0 pr-0 font-bold" />
                <th className="px-3 py-2 font-bold">Quote</th>
                <th className="px-3 py-2 font-bold">Source</th>
                <th className="px-3 py-2 font-bold">Type</th>
                <th className="px-3 py-2 font-bold">Score</th>
                <th className="py-2 pl-3 pr-4 font-bold">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {signals.slice(0, 6).map((signal) => {
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
      <td className="max-w-[520px] px-3 py-3.5 align-top">
        <a
          href={signal.url}
          target="_blank"
          rel="noreferrer"
          className="group block"
          title={signal.title}
        >
          <p className="line-clamp-3 text-[12px] leading-5 text-foreground/90 transition group-hover:text-accent-blue">
            &ldquo;{signal.quote}&rdquo;
          </p>
        </a>
      </td>

      {/* Source + date */}
      <td className="whitespace-nowrap px-3 py-3 align-top">
        <a
          href={signal.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 transition hover:opacity-85"
          title={`Open ${sourceLabels[signal.source]} source`}
        >
          <SourceIcon source={signal.source} size={14} />
          <span
            className={`text-[12px] font-bold ${sourceTextClass[signal.source]}`}
          >
            {sourceLabels[signal.source]}
          </span>
          <ExternalLink size={10} className="text-muted" />
        </a>
        {signal.publishedAt ? (
          <p className="mt-0.5 text-[10px] text-muted">
            {formatDate(signal.publishedAt)}
          </p>
        ) : null}
      </td>

      {/* Type */}
      <td className="px-3 py-3 align-top">
        <span className="rounded-full border border-line bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold capitalize text-muted">
          {signal.evidenceKind ?? "signal"}
        </span>
        <p className="mt-1 max-w-[150px] whitespace-normal text-[9px] leading-3 text-muted/75">
          {getEvidenceTrail(signal)}
        </p>
      </td>

      {/* Score */}
      <td className="px-3 py-3 align-top">
        {score ? (
          <span
            className={`font-mono text-[14px] font-black ${
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
          <span className="text-[11px] text-muted">-</span>
        )}
      </td>

      {/* Rationale */}
      <td className="max-w-[320px] py-3.5 pl-3 pr-4 align-top">
        <div className="space-y-1.5">
          {score?.reasons.length ? (
            <p className="line-clamp-3 text-[11px] leading-4 text-muted">
              {score.reasons.join(". ")}
            </p>
          ) : null}
          <a
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-blue transition hover:underline"
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
    <div className="flex items-center gap-2 border-b border-line/40 py-2.5 last:border-b-0 hover:bg-white/[0.02] transition">
      <span className="w-5 text-center text-[11px] font-bold text-accent-purple">
        {index}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">
        {cluster.title}
      </span>
      <span className="w-16 text-center">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${urgencyBadgeClass[cluster.urgency]}`}
        >
          {cluster.urgency}
        </span>
      </span>
      <span className="w-10 text-center text-[11px] font-mono text-accent-purple">
        {cluster.sourceDiversity ?? 1}/{cluster.signalIds.length > 3 ? 3 : cluster.signalIds.length}
      </span>
      <span className="flex w-24 justify-end gap-1 overflow-hidden">
        {cluster.relatedTools.slice(0, 2).map((tool) => (
          <span
            key={tool}
            className="truncate rounded border border-accent-purple/20 bg-accent-purple/8 px-1.5 py-0.5 text-[9px] font-semibold text-accent-purple/80"
          >
            {tool}
          </span>
        ))}
        {cluster.relatedTools.length > 2 ? (
          <span className="rounded border border-accent-purple/20 bg-accent-purple/8 px-1 py-0.5 text-[9px] text-accent-purple/60">
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
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5">
        <span className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wide">
          <Braces size={14} className="text-accent-purple" />
          Diagnostics Console
        </span>
        <div className="flex items-center gap-4">
          {timings.length > 0 && (
            <span className="text-[10px] text-muted">
              Total:{" "}
              <span className="font-mono font-bold text-accent-blue">
                {timings.find((t) => t.name === "total")?.durationMs ?? "-"}ms
              </span>
            </span>
          )}
          {result.metadata.llm.model && (
            <span className="text-[10px] text-muted">
              Model:{" "}
              <span className="font-semibold text-accent-purple">
                {result.metadata.llm.model}
              </span>
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
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
        <div className="grid gap-3 text-[11px] lg:grid-cols-5">
          {/* Timings */}
          <DiagnosticBlock
            title="Timings"
            icon={<Clock3 size={11} className="text-accent-blue" />}
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
            icon={<ShieldCheck size={11} className="text-accent-purple" />}
            titleRight={
              <span className="flex items-center gap-1 text-[9px]">
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
          </DiagnosticBlock>

          {/* Source Diagnostics */}
          <DiagnosticBlock
            title="Research Sources"
            icon={<BarChart3 size={11} className="text-accent-orange" />}
          >
            {searches.length ? (
              searches.slice(0, 4).map((s) => (
                <div
                  key={`${s.source}-${s.query}`}
                  className="flex items-center justify-between gap-2 border-b border-line/40 py-1 last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <SourceIcon source={s.source} size={12} />
                    <span className={`font-semibold ${sourceTextClass[s.source]}`}>
                      {sourceLongLabels[s.source]}
                    </span>
                    <span className="text-muted">{s.rawSignals}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px]">
                    <span
                      className={`size-2 rounded-full ${s.status === "success" ? "bg-success" : "bg-danger"}`}
                    />
                    <span className={s.status === "success" ? "text-success" : "text-danger"}>
                      {formatSearchStatus(s)}
                    </span>
                    <span className="text-muted">{s.durationMs}ms</span>
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted">No source diagnostics in demo.</p>
            )}
          </DiagnosticBlock>

          {/* Warnings */}
          <DiagnosticBlock
            title="Warnings"
            icon={<AlertTriangle size={11} className="text-warning" />}
            titleRight={
              warnings.length > 0 ? (
                <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-black text-warning">
                  {warnings.length}
                </span>
              ) : undefined
            }
          >
            {warnings.length ? (
              warnings.slice(0, 3).map((w) => (
                <p
                  key={w}
                  className="flex gap-1.5 border-b border-line/40 py-1 text-[10px] leading-4 text-warning/80 last:border-b-0"
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

          {/* Data Freshness */}
          <DiagnosticBlock
            title="Data Freshness"
            icon={<RadioTower size={11} className="text-success" />}
          >
            {searches.length ? (
              searches.slice(0, 4).map((s) => (
                <div
                  key={`fresh-${s.source}-${s.query}`}
                  className="flex items-center justify-between gap-2 border-b border-line/40 py-1 last:border-b-0"
                >
                  <span className={`font-semibold ${sourceTextClass[s.source]}`}>
                    {sourceLabels[s.source]}
                  </span>
                  <span className="flex items-center gap-1 text-[9px]">
                    <span
                      className={`size-2 rounded-full ${s.status === "success" ? "bg-success animate-pulse" : "bg-danger"}`}
                    />
                    <span className={s.status === "success" ? "font-bold text-success" : "text-danger"}>
                      {s.status === "success" ? "completed" : "failed"}
                    </span>
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted">Demo data</p>
            )}
          </DiagnosticBlock>
        </div>

        {sourceDebug.length ? (
          <div className="mt-3 rounded-md border border-line/50 bg-black/20 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
                <Network size={12} className="text-accent-blue" />
                Research Funnel Debug
              </span>
              <span className="text-[10px] text-muted">
                discovery to fetch to enrichment to evidence
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-[11px]">
                <thead>
                  <tr className="border-b border-line/50 text-[10px] font-black uppercase tracking-wider text-muted">
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
                                  className="rounded-full border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[9px] font-semibold text-warning"
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
                                className="line-clamp-1 text-[10px] text-muted"
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
                                className="line-clamp-1 text-[10px] text-muted"
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
            <p className="mt-2 text-[10px] leading-4 text-muted">
              Quality shows accepted/rejected before LLM judgment. Evidence is
              quote extraction output. Final is normalized evidence used by the
              dashboard.
            </p>
          </div>
        ) : null}

        {/* LLM Failure details */}
        {result.metadata.llm.failureReason ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-danger/25 bg-danger/8 px-3 py-2 text-[11px] text-danger">
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
    <div className="flex min-w-[120px] flex-1 flex-col justify-center px-4 py-2.5">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
        {icon}
        {label}
      </span>
      <p
        className={`mt-1 text-[16px] font-black capitalize tracking-tight ${valueClass}`}
      >
        {value}
      </p>
      {detail ? (
        <span className="mt-0.5 text-[10px] text-muted">{detail}</span>
      ) : null}
    </div>
  );
}

function MetricDivider() {
  return <div className="my-2.5 w-px bg-line" />;
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
      <div className="flex items-center justify-between border-b border-line/50 px-4 py-2.5">
        <span className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wide text-foreground">
          {icon}
          {title}
        </span>
        {headerRight}
      </div>
      <div className="flex-1 px-4 py-3">{children}</div>
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
    <div className="rounded-md border border-line/50 bg-black/20 px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
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
    <div className="flex items-center justify-between gap-3 border-b border-line/40 py-1 text-[11px] last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${valueClass}`}>{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-line/50 bg-black/12 p-4 text-center text-[12px] text-muted">
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
