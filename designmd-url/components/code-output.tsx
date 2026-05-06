"use client";

import { useEffect, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter/dist/cjs/prism";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface CodeOutputProps {
  content: string;
}

export function CodeOutput({ content }: CodeOutputProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-neutral-500">
        {content}
      </pre>
    );
  }

  return (
    <SyntaxHighlighter
      language="markdown"
      style={oneLight}
      showLineNumbers
      wrapLongLines
      lineNumberStyle={{
        minWidth: "2.5rem",
        paddingRight: "0.875rem",
        color: "#a3a3a3",
        fontVariantNumeric: "tabular-nums",
      }}
      customStyle={{
        margin: 0,
        padding: "1rem",
        background: "#fafafa",
        fontSize: "0.75rem",
        lineHeight: "1.65",
      }}
      codeTagProps={{
        style: {
          fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
          fontWeight: 500,
        },
      }}
    >
      {content}
    </SyntaxHighlighter>
  );
}
