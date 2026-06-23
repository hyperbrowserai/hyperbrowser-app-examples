"use client";

import { motion } from "framer-motion";
import { Layers, MousePointerClick, Navigation, Zap, AlertTriangle } from "lucide-react";
import type { Memory } from "@/lib/types";

function Section({
  icon,
  title,
  children,
  index,
  animate,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  index: number;
  animate: boolean;
}) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animate ? index * 0.12 : 0 }}
      className="border-b border-white/5 pb-5 last:border-0 last:pb-0"
    >
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] text-white/40">
        {icon}
        {title}
      </div>
      {children}
    </motion.div>
  );
}

export function MemoryCard({ memory, animate }: { memory: Memory; animate: boolean }) {
  return (
    <div className="border border-white/10 bg-black">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 p-5">
        <div>
          <h3 className="font-display text-lg text-white">{memory.domain}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/60">{memory.purpose}</p>
        </div>
        <span className="font-mono shrink-0 border border-white/10 px-2.5 py-1 text-[10px] text-white/40">
          {memory.pageType}
        </span>
      </div>

      <div className="space-y-5 p-5">
        <Section icon={<Layers className="h-3.5 w-3.5" />} title="Layout" index={0} animate={animate}>
          <div className="flex flex-wrap gap-1.5">
            {memory.layout.map((s) => (
              <span
                key={s}
                className="font-mono border border-white/10 px-2 py-0.5 text-[10px] text-white/70"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>

        <Section
          icon={<MousePointerClick className="h-3.5 w-3.5" />}
          title="Key elements"
          index={1}
          animate={animate}
        >
          <ul className="space-y-1.5">
            {memory.keyElements.map((e, i) => (
              <li key={i} className="text-sm text-white/90">
                <span className="font-medium">{e.label}</span>
                <span className="text-white/45">
                  {" "}
                  / {e.type}, {e.location}
                  {e.leadsTo ? ` -> ${e.leadsTo}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {memory.navigation.length > 0 && (
          <Section
            icon={<Navigation className="h-3.5 w-3.5" />}
            title="Navigation"
            index={2}
            animate={animate}
          >
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {memory.navigation.map((n, i) => (
                <span key={i} className="font-mono text-[10px] text-white/70">
                  {n.label} <span className="text-white/35">{n.href}</span>
                </span>
              ))}
            </div>
          </Section>
        )}

        <Section icon={<Zap className="h-3.5 w-3.5" />} title="Can do here" index={3} animate={animate}>
          <div className="flex flex-wrap gap-1.5">
            {memory.actions.map((a) => (
              <span key={a} className="border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-white">
                {a}
              </span>
            ))}
          </div>
        </Section>

        {memory.notes && (
          <Section
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            title="Notes before acting"
            index={4}
            animate={animate}
          >
            <p className="text-sm leading-relaxed text-white/60">{memory.notes}</p>
          </Section>
        )}
      </div>
    </div>
  );
}
