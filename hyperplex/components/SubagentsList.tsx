"use client";

import {
  Globe,
  Search,
  FileText,
  BarChart2,
  Code,
  BookOpen,
  Database,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { Subagent } from "@/types";

interface SubagentsListProps {
  subagents: Subagent[];
}

// Pick a deterministic icon per subagent index
const ICONS = [Globe, Search, FileText, BarChart2, Code, BookOpen, Database];

function SubagentStatusIcon({ status }: { status: string }) {
  if (status === "running") return <Loader2 className="w-4 h-4 text-black animate-spin flex-shrink-0" />;
  return <CheckCircle2 className="w-4 h-4 text-black flex-shrink-0" />;
}

export function SubagentsList({ subagents }: SubagentsListProps) {
  if (subagents.length === 0) return null;

  return (
    <div className="space-y-5 py-2">
      <h3 className="text-sm font-semibold text-gray-400">Running Subagents</h3>
      <div className="space-y-5">
        {subagents.map((agent, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <div 
              key={agent.id} 
              className="flex items-start gap-4 animate-slide-up"
              style={{ animationDelay: `${Math.min(i * 50, 500)}ms` }}
            >
              <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <span className="text-lg font-medium leading-snug text-gray-700">
                  {agent.task}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-600 border border-black whitespace-nowrap">
                  <Sparkles className="w-3 h-3 text-gray-300" />
                  {agent.model}
                </span>
                <SubagentStatusIcon status={agent.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
