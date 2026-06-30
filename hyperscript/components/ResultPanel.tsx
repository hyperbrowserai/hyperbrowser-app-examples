import type { RunStatus } from "@/lib/types";

type ResultPanelProps = {
  error: string | null;
  isRunning: boolean;
  output: string;
  status: RunStatus | null;
  stepCount: number;
};

export function ResultPanel({
  error,
  isRunning,
  output,
  status,
  stepCount,
}: ResultPanelProps) {
  let content = "";

  if (isRunning) {
    content = `running - step ${stepCount}`;
  } else if (error) {
    content = error;
  } else if (status) {
    content = output || "The run finished without a text output.";
  }

  return (
    <section className="border border-border bg-paper">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em]">
          Result
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
          {status ?? "idle"}
        </p>
      </div>
      <div className="min-h-36 whitespace-pre-wrap bg-background p-4 font-mono text-sm leading-7">
        {content}
      </div>
    </section>
  );
}
