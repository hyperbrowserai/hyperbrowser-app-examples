"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Card, SectionLabel } from "./result-container";
import type { ExtractedLinks } from "@/lib/types";

interface LinksCardProps {
  links: ExtractedLinks;
}

const GROUPS: { key: keyof ExtractedLinks; label: string }[] = [
  { key: "docs", label: "Docs" },
  { key: "pricing", label: "Pricing" },
  { key: "social", label: "Social" },
  { key: "other", label: "Other" },
];

function safeParse(url: string): { host: string; path: string } | null {
  try {
    const u = new URL(url);
    return { host: u.hostname.replace(/^www\./, ""), path: u.pathname };
  } catch {
    return null;
  }
}

export function LinksCard({ links }: LinksCardProps) {
  const total =
    links.docs.length + links.social.length + links.pricing.length + links.other.length;

  if (!total) return null;

  let staggerBase = 0;
  const groupStartIndex: Partial<Record<keyof ExtractedLinks, number>> = {};
  for (const { key } of GROUPS) {
    const items = links[key];
    groupStartIndex[key] = staggerBase;
    staggerBase += items.length;
  }

  return (
    <Card className="p-8 sm:p-10">
      <SectionLabel>{`Links. ${total}`}</SectionLabel>

      <div className="space-y-7">
        {GROUPS.map(({ key, label }) => {
          const items = links[key];
          if (!items.length) return null;
          const startGroup = groupStartIndex[key]!;
          return (
            <div key={key}>
              <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-neutral-500 mb-3">
                {label}. {items.length}
              </div>
              <ul className="space-y-1">
                {items.map((url, i) => {
                  const parsed = safeParse(url);
                  const delay = 0.9 + (startGroup + i) * 0.04;
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay, duration: 0.3 }}
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-black transition-colors"
                      >
                        {parsed && (
                          <Image
                            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.host)}&sz=32`}
                            alt=""
                            width={14}
                            height={14}
                            unoptimized
                            className="grayscale opacity-70 group-hover:opacity-100 transition-opacity"
                          />
                        )}
                        <span className="font-medium">
                          {parsed ? parsed.host : url}
                        </span>
                        {parsed && parsed.path && parsed.path !== "/" && (
                          <span className="text-neutral-400 truncate max-w-md">
                            {parsed.path}
                          </span>
                        )}
                        <ExternalLink
                          className="h-3 w-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          strokeWidth={2.25}
                        />
                      </a>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
