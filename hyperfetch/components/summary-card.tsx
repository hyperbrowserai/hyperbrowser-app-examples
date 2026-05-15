"use client";

import { motion } from "framer-motion";
import { Card, SectionLabel } from "./result-container";
import { CopyButton } from "./copy-button";
import { Typewriter } from "./typewriter";
import { ExternalLink, User, Calendar } from "lucide-react";
import type { EnrichedResult } from "@/lib/types";

interface SummaryCardProps {
  data: EnrichedResult;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const TYPE_LABELS: Record<string, string> = {
  documentation: "Documentation",
  blog: "Blog post",
  landing: "Landing page",
  pricing: "Pricing page",
  "api-reference": "API reference",
  news: "News",
  other: "Other",
};

export function SummaryCard({ data }: SummaryCardProps) {
  return (
    <Card className="p-8 sm:p-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionLabel>Summary</SectionLabel>
        <CopyButton value={JSON.stringify(data, null, 2)} label="Copy JSON" />
      </div>

      <div className="flex items-center gap-2 mb-5">
        <span className="inline-flex items-center text-[11px] font-mono uppercase tracking-[0.16em] px-2.5 py-1 border border-border text-neutral-700">
          {TYPE_LABELS[data.contentType] ?? data.contentType}
        </span>
        {data.author && (
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
            <User className="h-3 w-3" strokeWidth={2} />
            {data.author}
          </span>
        )}
        {data.lastUpdated && (
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
            <Calendar className="h-3 w-3" strokeWidth={2} />
            {data.lastUpdated}
          </span>
        )}
      </div>

      <h1 className="text-3xl sm:text-[36px] leading-[1.15] font-semibold tracking-tight text-foreground">
        <Typewriter text={data.title} speed={18} startDelay={900} caret />
      </h1>

      {data.description && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          className="mt-3 text-base text-neutral-500"
        >
          {data.description}
        </motion.p>
      )}

      {data.summary && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.45 }}
          className="mt-6 text-[18px] leading-[1.6] text-neutral-800"
        >
          {data.summary}
        </motion.p>
      )}

      <a
        href={data.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-black transition-colors group"
      >
        <span className="underline-offset-4 group-hover:underline">
          {hostnameOf(data.sourceUrl)}
        </span>
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
      </a>
    </Card>
  );
}
