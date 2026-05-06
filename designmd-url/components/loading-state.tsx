"use client";

type Phase = "fetching" | "formatting" | "done" | "idle";

interface LoadingStateProps {
  phase: Phase;
}

const MESSAGE: Record<Exclude<Phase, "idle">, string> = {
  fetching: "Fetching branding...",
  formatting: "Generating DESIGN.md...",
  done: "Done.",
};

export function LoadingState({ phase }: LoadingStateProps) {
  if (phase === "idle") return null;

  return (
    <div className="mx-auto mb-8 w-full max-w-3xl">
      <div className="flex items-center gap-4 border-4 border-black bg-white p-5 shadow-brutal">
        <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="text-base font-black uppercase tracking-wide text-black">{MESSAGE[phase]}</p>
      </div>
    </div>
  );
}

export type LoadingPhase = Phase;
