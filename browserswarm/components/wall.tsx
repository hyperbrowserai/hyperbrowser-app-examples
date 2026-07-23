"use client";

import { motion } from "framer-motion";
import { Tile } from "./tile";
import { HeroTile } from "./hero-tile";
import type { RunState } from "@/lib/use-swarm";

/**
 * The Wall: big 2x2 hero tiles (real Live View) clustered top-left, the rest of
 * the swarm as small page-job tiles filling the grid. `grid-flow-dense` packs
 * the small tiles around the heroes. Tiles light up in waves as the pool runs.
 */
export function Wall({ state, dim = false }: { state: RunState; dim?: boolean }) {
  const regular = state.tiles.filter((t) => !state.heroIds.has(t.id));

  return (
    <div
      className={`grid grid-flow-dense gap-2 auto-rows-[88px] grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 transition-opacity duration-700 ${
        dim ? "opacity-20" : "opacity-100"
      }`}
    >
      {state.hero.map((h) => (
        <div key={`hero-${h.id}`} className="col-span-2 row-span-2">
          <HeroTile hero={h} />
        </div>
      ))}

      {regular.map((t, i) => (
        <motion.div
          key={t.id}
          className="h-full"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: Math.min(i * 0.012, 0.5), ease: "easeOut" }}
        >
          <Tile tile={t} />
        </motion.div>
      ))}
    </div>
  );
}
