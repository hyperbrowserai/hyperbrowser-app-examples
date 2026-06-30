type LiveViewPanelProps = {
  liveUrl: string | null;
};

export function LiveViewPanel({ liveUrl }: LiveViewPanelProps) {
  return (
    <section className="grid h-[420px] min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-border bg-paper">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em]">
          Live Browser
        </p>
      </div>

      {liveUrl ? (
        <div className="min-h-0 overflow-hidden">
          <iframe
            allow="clipboard-read; clipboard-write"
            className="block h-full min-h-0 w-full border-0 bg-paper"
            referrerPolicy="no-referrer"
            src={liveUrl}
            title="Hyperbrowser Live View"
          />
        </div>
      ) : (
        <div className="flex min-h-0 items-center justify-center bg-background text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">
            Waiting for run
          </p>
        </div>
      )}
    </section>
  );
}
