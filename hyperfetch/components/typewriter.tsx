"use client";

import { useEffect, useState } from "react";

interface TypewriterProps {
  text: string;
  speed?: number;
  startDelay?: number;
  onDone?: () => void;
  className?: string;
  caret?: boolean;
}

export function Typewriter({
  text,
  speed = 22,
  startDelay = 0,
  onDone,
  className,
  caret = true,
}: TypewriterProps) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let iv: ReturnType<typeof setInterval> | undefined;

    const start = setTimeout(() => {
      if (cancelled) return;
      setOut("");
      setDone(false);
      let i = 0;
      iv = setInterval(() => {
        if (cancelled) return;
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length) {
          if (iv) clearInterval(iv);
          iv = undefined;
          setDone(true);
          onDone?.();
        }
      }, speed);
    }, startDelay);

    return () => {
      cancelled = true;
      clearTimeout(start);
      if (iv) clearInterval(iv);
    };
  }, [text, speed, startDelay, onDone]);

  return (
    <span className={className}>
      {out}
      {caret && !done && <span className="caret" aria-hidden />}
    </span>
  );
}

interface BlinkProps {
  className?: string;
}

export function Cursor({ className }: BlinkProps) {
  return <span className={`caret ${className ?? ""}`} aria-hidden />;
}
