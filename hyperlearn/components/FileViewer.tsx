"use client";

import { SkillTreeFile } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useMemo } from "react";

interface FileViewerProps {
  file: SkillTreeFile;
  allFiles: SkillTreeFile[];
  onNavigate: (path: string) => void;
}

function parseFrontmatter(content: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      meta[key] = val;
    }
  }

  return { meta, body: match[2] };
}

function resolveWikilink(
  name: string,
  allFiles: SkillTreeFile[]
): string | null {
  const target = name.trim().toLowerCase();
  const found = allFiles.find((f) => {
    const fileName = f.path.split("/").pop()?.replace(".md", "").toLowerCase();
    return fileName === target;
  });
  return found?.path ?? null;
}

function WikilinkRenderer({
  content,
  allFiles,
  onNavigate,
}: {
  content: string;
  allFiles: SkillTreeFile[];
  onNavigate: (path: string) => void;
}) {
  const parts = content.split(/(\[\[[^\]]+\]\])/g);

  return (
    <>
      {parts.map((part, i) => {
        const wikilinkMatch = part.match(/^\[\[([^\]]+)\]\]$/);
        if (wikilinkMatch) {
          const name = wikilinkMatch[1];
          const resolved = resolveWikilink(name, allFiles);
          if (resolved) {
            return (
              <button
                key={i}
                onClick={() => onNavigate(resolved)}
                className="inline font-bold text-black bg-gray-200 px-1 py-0.5 border border-gray-300 hover:bg-black hover:text-white transition-colors cursor-pointer font-mono text-[0.85em]"
              >
                {name}
              </button>
            );
          }
          return (
            <span
              key={i}
              className="font-mono text-[0.85em] text-gray-500 bg-gray-100 px-1 py-0.5"
            >
              {name}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function FileViewer({
  file,
  allFiles,
  onNavigate,
}: FileViewerProps) {
  const { meta, body } = useMemo(() => parseFrontmatter(file.content), [file]);

  const hasMetadata = Object.keys(meta).length > 0;

  return (
    <div className="h-full overflow-y-auto p-6">
      {hasMetadata && (
        <div className="mb-6 border-2 border-gray-200 bg-gray-50 p-4 font-mono text-xs">
          {meta.title && (
            <div className="mb-1">
              <span className="text-gray-500">title:</span>{" "}
              <span className="font-bold">{meta.title}</span>
            </div>
          )}
          {meta.description && (
            <div className="mb-1">
              <span className="text-gray-500">description:</span>{" "}
              <span>{meta.description}</span>
            </div>
          )}
          {meta.links && (
            <div>
              <span className="text-gray-500">links:</span>{" "}
              <span>{meta.links}</span>
            </div>
          )}
        </div>
      )}

      <div className="prose prose-slate max-w-none prose-pre:bg-gray-100 prose-pre:border prose-pre:border-black prose-pre:text-black prose-pre:shadow-sm prose-code:text-purple-700 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-bold prose-headings:font-bold prose-headings:text-black prose-a:text-blue-600 prose-a:underline prose-a:decoration-2 prose-a:underline-offset-2">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <div className="border-b-4 border-black pb-3 mb-6">
                <h1 className="text-3xl font-black text-black m-0">
                  {children}
                </h1>
              </div>
            ),
            h2: ({ children }) => (
              <div className="flex items-center gap-2 mt-8 mb-3">
                <span className="text-gray-400 font-black text-lg">##</span>
                <h2 className="text-xl font-bold text-black m-0 uppercase tracking-tight">
                  {children}
                </h2>
              </div>
            ),
            p: ({ children }) => {
              const text =
                typeof children === "string" ? children : undefined;
              if (text && text.includes("[[")) {
                return (
                  <p className="text-gray-800 leading-relaxed my-3">
                    <WikilinkRenderer
                      content={text}
                      allFiles={allFiles}
                      onNavigate={onNavigate}
                    />
                  </p>
                );
              }
              return (
                <p className="text-gray-800 leading-relaxed my-3">
                  {children}
                </p>
              );
            },
            code: ({ children, className }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="bg-gray-100 text-purple-700 px-1.5 py-0.5 rounded-sm font-mono text-sm font-bold border border-gray-200">
                    {children}
                  </code>
                );
              }
              const match = /language-(\w+)/.exec(className || "");
              return (
                <div className="relative my-4 rounded-md overflow-hidden border border-gray-300 shadow-sm">
                  <SyntaxHighlighter
                    style={oneLight}
                    language={match ? match[1] : "text"}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: "1.25rem",
                      backgroundColor: "#f6f8fa",
                      fontSize: "0.85rem",
                      lineHeight: "1.5",
                    }}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </div>
              );
            },
            ul: ({ children }) => (
              <ul className="list-disc list-inside my-3 space-y-1 text-gray-800">
                {children}
              </ul>
            ),
            li: ({ children }) => {
              const text =
                typeof children === "string" ? children : undefined;
              if (text && text.includes("[[")) {
                return (
                  <li className="text-gray-800 ml-4">
                    <WikilinkRenderer
                      content={text}
                      allFiles={allFiles}
                      onNavigate={onNavigate}
                    />
                  </li>
                );
              }
              return <li className="text-gray-800 ml-4">{children}</li>;
            },
          }}
        >
          {body}
        </ReactMarkdown>
      </div>
    </div>
  );
}
