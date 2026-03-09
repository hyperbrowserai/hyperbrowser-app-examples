"use client";

import { Search, Globe, Sparkles, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { Step } from "@/types";

interface StepsTimelineProps {
  steps: Step[];
}

const STEP_CONFIG = {
  search: { label: "Plan", Icon: Search, description: "Decomposing goal into subtasks and assigning models" },
  fetch: { label: "Run Subagents", Icon: Globe, description: "Running parallel subagents across multiple models" },
  synthesize: { label: "Synthesize", Icon: Sparkles, description: "Merging findings into a comprehensive answer" },
} as const;

const STEP_ORDER: Array<"search" | "fetch" | "synthesize"> = ["search", "fetch", "synthesize"];

function formatDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "running") {
    return <Loader2 className="w-4 h-4 text-black animate-spin" />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="w-4 h-4 text-black" />;
  }
  if (status === "failed") {
    return <XCircle className="w-4 h-4 text-gray-500" />;
  }
  return <Clock className="w-4 h-4 text-gray-300" />;
}

export function StepsTimeline({ steps }: StepsTimelineProps) {
  const stepMap = new Map(steps.map((s) => [s.type, s]));

  return (
    <div className="space-y-0">
      {STEP_ORDER.map((type, index) => {
        const config = STEP_CONFIG[type];
        const step = stepMap.get(type);
        const status = step?.status ?? "queued";
        const { Icon } = config;

        const isLast = index === STEP_ORDER.length - 1;

        return (
          <div 
            key={type} 
            className="flex gap-3 animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Timeline line + icon */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0
                  ${status === "completed" ? "border-black bg-white" : ""}
                  ${status === "running" ? "border-black bg-gray-100" : ""}
                  ${status === "failed" ? "border-gray-400 bg-gray-50" : ""}
                  ${status === "queued" ? "border-gray-200 bg-white" : ""}
                `}
              >
                <Icon
                  className={`w-3.5 h-3.5
                    ${status === "completed" ? "text-black" : ""}
                    ${status === "running" ? "text-black" : ""}
                    ${status === "failed" ? "text-gray-500" : ""}
                    ${status === "queued" ? "text-gray-300" : ""}
                  `}
                />
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 my-1 min-h-[20px] ${
                    status === "completed" ? "bg-black" : "bg-gray-200"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-6 flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className={`text-base font-semibold ${
                  status === "queued" ? "text-gray-400" : "text-black"
                }`}>
                  {config.label}
                </span>
                <StatusIcon status={status} />
                {step?.startedAt && step?.finishedAt && (
                  <span className="text-sm text-gray-500 font-medium">
                    {formatDuration(step.startedAt, step.finishedAt)}
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 font-medium ${status === "queued" ? "text-gray-400" : "text-gray-600"}`}>
                {config.description}
              </p>
              {step?.error && (
                <p className="text-sm text-gray-500 mt-2 font-mono truncate">{step.error}</p>
              )}
              {status === "running" && (
                <div className="mt-2 h-1.5 w-32 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full animate-pulse w-1/2" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
