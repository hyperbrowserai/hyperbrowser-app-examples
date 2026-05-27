"use client";

import { motion } from "framer-motion";
import { BrowserPane } from "./browser-pane";
import { AGENT_LABELS, AGENT_ORDER, type Scan } from "@/lib/types";

interface Props {
  scan: Scan;
}

export function AgentGrid({ scan }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
      {AGENT_ORDER.map((name, i) => {
        const session = scan.sessions[name];
        const result = scan.results[name];
        const startedAt = result?.startedAt ?? scan.createdAt;
        return (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
          >
            <BrowserPane
              label={AGENT_LABELS[name]}
              session={session}
              result={result}
              startedAt={startedAt}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
