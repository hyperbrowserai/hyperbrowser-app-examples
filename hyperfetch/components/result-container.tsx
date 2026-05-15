"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Typewriter } from "./typewriter";

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.55, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 220, damping: 28 },
  },
};

interface ResultContainerProps {
  children: ReactNode;
}

export function ResultContainer({ children }: ResultContainerProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      {children}
    </motion.div>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <motion.section
      variants={item}
      className={`bg-surface border border-border relative overflow-hidden ${className ?? ""}`}
    >
      <ScanLine />
      {children}
    </motion.section>
  );
}

function ScanLine() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 z-10"
    >
      <div
        className="absolute inset-y-0 w-px bg-foreground/50"
        style={{
          animation: "scan-sweep 0.95s ease-out forwards",
          boxShadow: "0 0 28px 14px rgba(0,0,0,0.06)",
        }}
      />
    </motion.div>
  );
}

interface SectionLabelProps {
  children: string;
  showStatus?: boolean;
}

export function SectionLabel({ children, showStatus = true }: SectionLabelProps) {
  const [labelDone, setLabelDone] = useState(false);

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-500 inline-flex items-center">
        <Typewriter
          text={children}
          speed={28}
          startDelay={180}
          onDone={() => setLabelDone(true)}
        />
      </div>
      {showStatus && <StatusBadge done={labelDone} />}
    </div>
  );
}

function StatusBadge({ done }: { done: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em]">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.span
            key="ready"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-1.5 text-foreground"
          >
            <span className="block h-1.5 w-1.5 bg-foreground" />
            Ready
          </motion.span>
        ) : (
          <motion.span
            key="streaming"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-1.5 text-neutral-500"
          >
            <span
              className="block h-1.5 w-1.5 bg-neutral-500 rounded-full"
              style={{ animation: "pulse-dot 1.1s ease-in-out infinite" }}
            />
            Streaming
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
