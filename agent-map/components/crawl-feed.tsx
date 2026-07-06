"use client";

import { useEffect, useRef } from "react";

import type { CrawlFeedItem } from "@/lib/types";
import { compactUrl } from "@/lib/url-utils";

type CrawlFeedProps = {
  items: CrawlFeedItem[];
  status: string;
};

export function CrawlFeed({ items, status }: CrawlFeedProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [items.length]);

  return (
    <section className="flex min-h-0 flex-col border border-[var(--border)] bg-[var(--panel)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          Live crawl feed
        </h2>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--subtle)]">
          {status}
        </span>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[0.68rem] leading-5"
      >
        {items.length === 0 ? (
          <div className="text-[var(--subtle)]">
            Waiting for the first real crawled page.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.url}
                className="fade-in grid gap-1 border-b border-[var(--border)] pb-2 last:border-b-0"
              >
                <div className="flex items-center gap-3 text-[var(--subtle)]">
                  <span>{formatTime(item.timestamp)}</span>
                  <span className="uppercase tracking-[0.16em]">
                    {item.status}
                  </span>
                </div>
                <div className="truncate text-[var(--foreground)]">
                  {item.title || "Untitled page"}
                </div>
                <div className="truncate text-[var(--muted)]">
                  {compactUrl(item.url)}
                </div>
                {item.error ? (
                  <div className="text-[var(--subtle)]">{item.error}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
