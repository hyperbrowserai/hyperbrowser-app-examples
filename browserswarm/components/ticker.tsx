"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mono, tabular-nums counter that eases toward its target value — the
 * instrument-panel ticker used for every live count. Purely presentational:
 * it animates to whatever real number it's handed.
 */
export function Ticker({
  value,
  className = "",
  duration = 500,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(from + (to - from) * eased);
      setDisplay(cur);
      fromRef.current = cur;
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={`font-mono tnum ${className}`}>{display.toLocaleString()}</span>;
}
