import {
  ArrowUpRight,
  FileText,
  Mail,
  Megaphone,
  MessageSquareQuote,
  Target,
} from "lucide-react";
import type { MineResult } from "@/lib/types";

type ResultsDashboardProps = {
  result: MineResult;
};

export function ResultsDashboard({ result }: ResultsDashboardProps) {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Signals" value={result.signals.length} />
        <Metric label="Clusters" value={result.clusters.length} />
        <Metric label="Growth plays" value={result.growthPlays.length} />
        <Metric label="Mode" value={result.mode.toUpperCase()} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel icon={<Target size={18} />} title="Pain clusters">
          <div className="space-y-3">
            {result.clusters.map((cluster) => (
              <article key={cluster.id} className="rounded-lg border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold">{cluster.title}</h3>
                  <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-bold uppercase text-foreground">
                    {cluster.urgency}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{cluster.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cluster.relatedTools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-full border border-line px-2.5 py-1 text-xs text-muted"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel icon={<Megaphone size={18} />} title="Growth plays">
          <div className="space-y-3">
            {result.growthPlays.map((play) => (
              <article key={play.id} className="rounded-lg border border-line p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted">
                  <span>{play.channel}</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold">{play.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {play.recommendedAction}
                </p>
                <p className="mt-3 rounded-md bg-zinc-950 p-3 text-xs leading-5 text-zinc-100">
                  {play.copyDraft}
                </p>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<MessageSquareQuote size={18} />} title="Evidence quotes">
          <div className="space-y-3">
            {result.signals.map((signal) => (
              <article key={signal.id} className="rounded-lg border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{signal.title}</p>
                  <span className="rounded-full border border-line px-2 py-1 text-[11px] uppercase text-muted">
                    {signal.source}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  &ldquo;{signal.quote}&rdquo;
                </p>
                <a
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-foreground underline decoration-2 underline-offset-4"
                  href={signal.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source <ArrowUpRight size={13} />
                </a>
              </article>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel icon={<FileText size={18} />} title="Content angles">
            <ul className="space-y-2 text-sm leading-6 text-muted">
              {result.contentAngles.map((angle) => (
                <li key={angle} className="rounded-lg border border-line p-3">
                  {angle}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<Mail size={18} />} title="Outbound drafts">
            <ul className="space-y-2 text-sm leading-6 text-muted">
              {result.outboundDrafts.map((draft) => (
                <li key={draft} className="rounded-lg border border-line p-3">
                  {draft}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {result.metadata.notes.length > 0 || result.metadata.errors.length > 0 ? (
        <div className="rounded-lg border border-line bg-panel p-4 text-xs leading-5 text-muted">
          {[...result.metadata.notes, ...result.metadata.errors].map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <p className="text-xs font-bold uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-foreground">
          {icon}
        </span>
        <h2 className="text-sm font-black uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}
