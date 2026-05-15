"use client";

import { useMemo } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import { Card, SectionLabel } from "./result-container";
import { CopyButton } from "./copy-button";
import type { ExtractedCode } from "@/lib/types";

interface CodeCardProps {
  codeBlocks: ExtractedCode[];
}

const LANG_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
};

function Highlighted({ code, language }: { code: string; language: string }) {
  const lang = LANG_MAP[language?.toLowerCase()] ?? language?.toLowerCase() ?? "";

  const html = useMemo(() => {
    if (lang && Prism.languages[lang]) {
      try {
        return Prism.highlight(code, Prism.languages[lang], lang);
      } catch {
        return null;
      }
    }
    return null;
  }, [code, lang]);

  if (html) {
    return (
      <pre
        className="text-[13px] leading-relaxed text-neutral-800 overflow-x-auto scrollbar-thin"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <pre className="text-[13px] leading-relaxed text-neutral-800 overflow-x-auto scrollbar-thin">
      <code>{code}</code>
    </pre>
  );
}

export function CodeCard({ codeBlocks }: CodeCardProps) {
  if (!codeBlocks.length) return null;

  return (
    <Card className="p-8 sm:p-10">
      <SectionLabel>{`Code blocks. ${codeBlocks.length}`}</SectionLabel>

      <div className="space-y-6">
        {codeBlocks.map((block, i) => (
          <div key={i}>
            <div className="bg-subtle border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-neutral-500">
                  {block.language || "code"}
                </span>
                <CopyButton value={block.code} />
              </div>
              <div className="p-5">
                <Highlighted code={block.code} language={block.language} />
              </div>
            </div>
            {block.description && (
              <p className="mt-3 text-xs text-neutral-500 leading-relaxed">
                {block.description}
              </p>
            )}
          </div>
        ))}
      </div>

      <style jsx global>{`
        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          color: #a3a3a3;
          font-style: italic;
        }
        .token.punctuation {
          color: #525252;
        }
        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol,
        .token.deleted {
          color: #262626;
        }
        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
          color: #525252;
        }
        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string {
          color: #525252;
        }
        .token.atrule,
        .token.attr-value,
        .token.keyword {
          color: #000000;
          font-weight: 600;
        }
        .token.function,
        .token.class-name {
          color: #171717;
          font-weight: 500;
        }
        .token.regex,
        .token.important,
        .token.variable {
          color: #404040;
        }
      `}</style>
    </Card>
  );
}
