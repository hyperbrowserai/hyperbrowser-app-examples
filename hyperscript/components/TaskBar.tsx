import { Play } from "lucide-react";

type TaskBarProps = {
  task: string;
  url: string;
  isRunning: boolean;
  onTaskChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onRun: () => void;
};

export function TaskBar({
  task,
  url,
  isRunning,
  onTaskChange,
  onUrlChange,
  onRun,
}: TaskBarProps) {
  const canRun = task.trim().length > 0 && url.trim().length > 0 && !isRunning;

  return (
    <form
      className="grid gap-4 border border-border bg-paper p-4 lg:grid-cols-[minmax(0,1fr)_340px_120px] lg:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        if (canRun) {
          onRun();
        }
      }}
    >
      <label className="grid gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em]">
          Task
        </span>
        <input
          className="h-12 border border-border bg-paper px-3 font-mono text-sm outline-none disabled:bg-background"
          disabled={isRunning}
          onChange={(event) => onTaskChange(event.target.value)}
          placeholder="log in and go to billing, read the current plan name"
          value={task}
        />
      </label>

      <label className="grid gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em]">
          Starting URL
        </span>
        <input
          className="h-12 border border-border bg-paper px-3 font-mono text-sm outline-none disabled:bg-background"
          disabled={isRunning}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://example.com"
          value={url}
        />
      </label>

      <button
        className="flex h-12 items-center justify-center gap-2 border border-border bg-foreground px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-background disabled:bg-paper disabled:text-foreground"
        disabled={!canRun}
        type="submit"
      >
        <Play aria-hidden="true" size={16} strokeWidth={1.7} />
        Run
      </button>
    </form>
  );
}
