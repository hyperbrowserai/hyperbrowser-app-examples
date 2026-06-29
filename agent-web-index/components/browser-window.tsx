"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { asciiBar } from "@/lib/format";
import type { Site } from "@/lib/types";

const STEP_MS = 1400;

export default function BrowserWindow({ site }: { site: Site }) {
  return <BrowserReplay key={site.id} site={site} />;
}

function BrowserReplay({ site }: { site: Site }) {
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Advance the scripted replay for this mounted site.
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);

    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= site.replay.length - 1) {
          if (timer.current) clearInterval(timer.current);
          return s; // hold on the final frame, where the run stops
        }
        return s + 1;
      });
    }, STEP_MS);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [site.replay.length]);

  const total = site.replay.length;
  const current = site.replay[step];
  const done = step >= total - 1;
  const progress = asciiBar(((step + 1) / total) * 100, 24);
  const currentShot = current?.screenshot;

  return (
    <div className="border-4 border-black shadow-brutal-lg bg-white">
      {/* chrome: tab + address bar, monochrome, no traffic dots */}
      <div className="border-b-4 border-black bg-black text-white">
        <div className="flex items-end px-3 pt-2.5 gap-2">
          <div className="bg-white text-black font-mono text-xs font-bold px-3 py-1.5 max-w-[60%] truncate">
            {site.label}
          </div>
          <span className="font-mono text-xs text-gray-500 pb-1.5 select-none">
            +
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 pb-2.5 pt-2">
          <span className="font-mono text-xs text-gray-500 select-none">
            [ &larr; &rarr; &#x21bb; ]
          </span>
          <div className="flex-1 min-w-0 bg-white text-black font-mono text-xs px-3 py-1.5 truncate">
            {site.url}
          </div>
        </div>
      </div>

      {/* viewport: scripted replay */}
      <div className="relative h-[300px] sm:h-[340px] overflow-hidden bg-white">
        {currentShot ? (
          // real screenshot path from /public when provided (the seam)
          <Image
            src={currentShot}
            alt={current.action}
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover grayscale"
            priority
          />
        ) : (
          <Wireframe step={step} done={done} />
        )}

        {/* caption overlay */}
        <div className="absolute left-0 right-0 bottom-0 bg-black text-white px-4 py-3 font-mono">
          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-widest text-gray-400">
            <span>
              step {step + 1} / {total}
            </span>
            <span className="flex items-center gap-2">
              {done ? (
                <>
                  <span className="inline-block w-2 h-2 bg-gray-500" />
                  run stopped
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 bg-white animate-pulse" />
                  replaying
                </>
              )}
            </span>
          </div>
          <div className="mt-1.5 text-sm lowercase">{current?.action}</div>
          <div className="mt-1 text-xs tracking-[2px] text-gray-500 truncate">
            {progress}
          </div>
        </div>
      </div>
    </div>
  );
}

// stylized monochrome page skeleton, advances subtly per step
function Wireframe({ step, done }: { step: number; done: boolean }) {
  return (
    <div className="absolute inset-0 p-6 pb-24">
      <div
        aria-hidden
        className="h-full w-full opacity-90"
        style={{ transform: `translateY(-${Math.min(step, 5) * 8}px)`, transition: "transform .5s ease" }}
      >
        {/* header band */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 border-2 border-black" />
          <div className="h-3 w-40 bg-black/80" />
          <div className="ml-auto h-3 w-16 bg-black/30" />
        </div>
        {/* content rows */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="col-span-2 space-y-2.5">
            <div className="h-3 w-full bg-black/70" />
            <div className="h-3 w-11/12 bg-black/40" />
            <div className="h-3 w-10/12 bg-black/40" />
            <div className="h-3 w-9/12 bg-black/25" />
            <div className="h-24 w-full border-2 border-black mt-3" />
            <div className="h-3 w-8/12 bg-black/30" />
          </div>
          <div className="space-y-3">
            <div className="h-16 w-full border-2 border-black" />
            <div className="h-3 w-full bg-black/30" />
            <div className="h-3 w-5/6 bg-black/20" />
            <div
              className={`h-10 w-full border-2 border-black ${done ? "bg-black/10" : "bg-transparent"}`}
            />
          </div>
        </div>
      </div>
      {done && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-mono text-xs uppercase tracking-widest border-2 border-black bg-white px-3 py-1.5 shadow-brutal-sm">
            run ends here
          </div>
        </div>
      )}
    </div>
  );
}
