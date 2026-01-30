"use client";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Download, Check, Terminal, FileCode } from "lucide-react";
import { useState } from "react";

interface PreviewSectionProps {
  content: string;
}

export default function PreviewSection({ content }: PreviewSectionProps) {
  const [copied, setCopied] = useState(false);

  if (!content) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SKILL.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 relative">
      {/* Sticky Action Header */}
      <div className="sticky top-6 z-10 mb-[-4px]">
        <div className="bg-black text-white p-4 flex items-center justify-between border-4 border-black shadow-brutal border-b-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-red-600" />
            <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600" />
            <div className="ml-4 flex items-center gap-2 font-mono text-sm text-gray-400">
              <FileCode size={16} />
              <span>SKILL.md</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Download size={14} />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Editor Window */}
      <div className="border-4 border-black bg-white p-8 shadow-brutal min-h-[600px] font-mono text-sm leading-relaxed">
        <div className="prose prose-slate max-w-none prose-pre:bg-gray-100 prose-pre:border prose-pre:border-black prose-pre:text-black prose-pre:shadow-sm prose-code:text-purple-700 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-bold prose-headings:font-bold prose-headings:text-black prose-a:text-blue-600 prose-a:underline prose-a:decoration-2 prose-a:underline-offset-2 hover:prose-a:bg-black hover:prose-a:text-white">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <div className="border-b-4 border-black pb-4 mb-8">
                  <h1 className="text-4xl font-black text-black m-0">{children}</h1>
                </div>
              ),
              h2: ({ children }) => (
                <div className="flex items-center gap-2 mt-12 mb-4">
                  <span className="text-purple-600 font-black text-xl">##</span>
                  <h2 className="text-2xl font-bold text-black m-0 uppercase tracking-tight">{children}</h2>
                </div>
              ),
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
                  <div className="relative group my-6 rounded-md overflow-hidden border border-gray-300 shadow-sm">
                    <SyntaxHighlighter
                      style={oneLight}
                      language={match ? match[1] : "text"}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        padding: "1.5rem",
                        backgroundColor: "#f6f8fa",
                        fontSize: "0.875rem",
                        lineHeight: "1.5",
                      }}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  </div>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-6 text-gray-600 italic">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside my-4 space-y-1 text-gray-800">
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li className="text-gray-800 ml-4">{children}</li>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
