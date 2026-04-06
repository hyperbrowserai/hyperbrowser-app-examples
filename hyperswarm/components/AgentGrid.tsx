"use client";

import type { AgentUiState } from "@/hooks/useSwarm";
import { motion } from "framer-motion";
import { AgentCard } from "@/components/AgentCard";

type Props = { agents: AgentUiState[] };

export function AgentGrid({ agents }: Props) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: 0.1, delayChildren: 0.06 },
        },
      }}
    >
      {agents.map((agent) => (
        <motion.div
          key={agent.index}
          variants={{
            hidden: { opacity: 0, y: 16 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          <AgentCard agent={agent} />
        </motion.div>
      ))}
    </motion.div>
  );
}
