"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FileCode } from "lucide-react";
import ActionButtons from "./action-buttons";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface CodeOutputProps {
  content: string;
}

export default function CodeOutput({ content }: CodeOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div ref={containerRef} className="flex flex-col min-h-[560px] border-4 border-black bg-white shadow-brutal overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-4 border-black bg-black shrink-0">
        <div className="flex items-center gap-2 font-mono text-sm text-gray-400 min-w-0">
          <FileCode size={16} className="shrink-0 text-white" />
          <span className="truncate text-white font-semibold">DESIGN.md</span>
        </div>
        <ActionButtons content={content} filename="DESIGN.md" />
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
        <SyntaxHighlighter
          language="markdown"
          style={oneLight}
          showLineNumbers
          showInlineLineNumbers={false}
          startingLineNumber={1}
          customStyle={{
            margin: 0,
            padding: "1.5rem 0",
            background: "#ffffff",
            fontSize: "0.875rem",
            lineHeight: 1.6,
            minHeight: "100%",
          }}
          lineNumberStyle={{
            minWidth: "3rem",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            color: "#9ca3af",
            textAlign: "right",
            userSelect: "none",
            borderRight: "2px solid #e5e7eb",
            marginRight: "1.5rem",
          }}
          codeTagProps={{
            className: "font-mono text-black",
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
