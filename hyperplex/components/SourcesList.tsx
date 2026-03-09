"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Source } from "@/types";

interface SourcesListProps {
  sources: Source[];
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function SourceCard({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);
  const domain = getDomain(source.url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 bg-white hover:border-black transition-colors">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconUrl}
          alt=""
          className="w-5 h-5 mt-0.5 rounded-sm flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold text-black hover:underline line-clamp-2 leading-snug"
            >
              {source.title ?? domain}
            </a>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4 text-gray-400 hover:text-black" />
            </a>
          </div>
          <p className="text-sm text-gray-500 mt-1 font-medium">{domain}</p>
          {source.snippet && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2 font-normal">{source.snippet}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            {source.rawMarkdown && (
              <Badge variant="secondary" className="text-xs py-0.5 px-2 h-5 font-medium bg-gray-100 text-black border border-gray-200">
                <FileText className="w-3 h-3 mr-1" />
                Fetched
              </Badge>
            )}
            {source.rawMarkdown && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm font-medium text-black hover:underline flex items-center gap-1"
              >
                {expanded ? (
                  <>Hide content <ChevronUp className="w-4 h-4" /></>
                ) : (
                  <>Show content <ChevronDown className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
          {expanded && source.rawMarkdown && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-700 max-h-60 overflow-y-auto whitespace-pre-wrap">
              {source.rawMarkdown.slice(0, 2000)}
              {source.rawMarkdown.length > 2000 && (
                <span className="text-gray-400">... (truncated)</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SourcesList({ sources }: SourcesListProps) {
  const [showAll, setShowAll] = useState(false);

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-600">No sources collected</p>
        <p className="text-xs text-gray-400 mt-1">This run didn't fetch any external web pages.</p>
      </div>
    );
  }

  const visible = showAll ? sources : sources.slice(0, 6);
  const remaining = sources.length - 6;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {visible.map((source, i) => (
          <div 
            key={source.id}
            className="animate-slide-up"
            style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
          >
            <SourceCard source={source} />
          </div>
        ))}
      </div>
      {!showAll && remaining > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Show {remaining} more source{remaining > 1 ? "s" : ""}
        </Button>
      )}
    </div>
  );
}
