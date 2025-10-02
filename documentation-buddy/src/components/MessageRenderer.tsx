'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface MessageRendererProps {
  content: string;
  role: 'user' | 'assistant';
}

export function MessageRenderer({ content, role }: MessageRendererProps) {
  if (role === 'user') {
    // For user messages, just render as plain text
    return <div className="whitespace-pre-wrap break-words text-white">{content}</div>;
  }

  // For assistant messages, render with markdown support
  return (
    <div className="prose prose-sm max-w-none prose-invert">
      <ReactMarkdown
        components={{
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const isInline = !className;
            
            if (!isInline && match) {
              return (
                <CodeBlock
                  language={language}
                  code={String(children).replace(/\n$/, '')}
                />
              );
            }
            
            return (
              <code 
                className="px-1.5 py-0.5 bg-black/30 text-[#F0FF26] rounded text-sm font-mono border border-[#F0FF26]/30" 
                {...rest}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0 text-white">{children}</p>;
          },
          ul({ children }) {
            return <ul className="mb-3 pl-4 space-y-1 text-white">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-3 pl-4 space-y-1 text-white">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-white">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-lg font-semibold mb-2 text-white">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-base font-semibold mb-2 text-white">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-sm font-semibold mb-1 text-white">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-[#F0FF26] pl-3 py-1 bg-[#F0FF26]/10 my-2 text-white">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#F0FF26] hover:text-[#e0ef00] underline transition-colors"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-gray-900 text-gray-200 px-4 py-2 text-sm rounded-t-lg border border-[#F0FF26]/30">
        <span className="font-medium text-[#F0FF26]">{language || 'Code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 text-gray-300 hover:text-[#F0FF26] transition-colors opacity-0 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="rounded-b-lg overflow-hidden border-x border-b border-[#F0FF26]/30">
        <SyntaxHighlighter
          style={oneDark}
          language={language || 'text'}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 0.5rem 0.5rem',
            fontSize: '0.875rem',
            backgroundColor: '#1a1a1a',
          }}
          showLineNumbers={code.split('\n').length > 3}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
} 