"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  icon: LucideIcon;
  active: boolean;
  badge?: string;
  children: ReactNode;
  className?: string;
}

// Shared chrome for a workspace panel. Animates in once it has its first event;
// shows a subtle "waiting" state until then.
export function Panel({ title, icon: Icon, active, badge, children, className = "" }: PanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: active ? 1 : 0.55, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#242424] bg-[#141414] ${className}`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[#242424] px-4 py-2.5">
        <Icon size={14} className={active ? "text-foreground" : "text-muted"} strokeWidth={2} />
        <span className="font-mono-code text-[11px] uppercase tracking-widest text-muted">
          {title}
        </span>
        {badge && (
          <span className="ml-auto rounded-full border border-[#242424] px-2 py-0.5 font-mono-code text-[10px] text-muted">
            {badge}
          </span>
        )}
        {!active && (
          <span className="ml-auto font-mono-code text-[10px] uppercase tracking-widest text-muted/50">
            waiting
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </motion.div>
  );
}
