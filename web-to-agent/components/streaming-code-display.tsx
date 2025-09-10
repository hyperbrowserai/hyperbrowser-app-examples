'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Action } from '@/lib/types';

interface StreamingCodeDisplayProps {
  actions: Action[];
  url: string;
  onComplete: (code: string) => void;
}

export function StreamingCodeDisplay({ actions, url, onComplete }: StreamingCodeDisplayProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedCode, setStreamedCode] = useState('');
  const [, setIsComplete] = useState(false);

  // Format code into readable blocks with syntax highlighting
  const formatCodeBlocks = (code: string) => {
    if (!code) return '';

    // Split code into logical sections
    const sections = code.split(/(?=\/\*[\s\S]*?\*\/)|(?=export\s+(?:const|type|interface))/);

    return sections
      .filter(section => section.trim())
      .map((section, index) => {
        const trimmed = section.trim();
        if (!trimmed) return '';

        // Add visual separators between sections
        const separator = index > 0 ? '\n\n' : '';

        // Add syntax highlighting classes (basic)
        let formatted = trimmed;

        // Highlight comments
        formatted = formatted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-green-400">$1</span>');
        formatted = formatted.replace(/(\/\/.*$)/gm, '<span class="text-green-400">$1</span>');

        // Highlight keywords
        formatted = formatted.replace(/\b(export|const|type|interface|import|from|async|await|try|catch|if|else|return)\b/g, '<span class="text-blue-400">$1</span>');

        // Highlight strings
        formatted = formatted.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="text-yellow-400">$1$2$1</span>');

        return separator + formatted;
      })
      .join('');
  };

  const startStreaming = async () => {
    setIsStreaming(true);
    setStreamedCode('');
    setIsComplete(false);

    try {
      const response = await fetch('/api/scaffold-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions, url }),
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let fullCode = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('0:')) {
            // AI SDK streaming format: extract the actual content
            try {
              const data = JSON.parse(line.slice(2));
              if (data.textDelta) {
                fullCode += data.textDelta;
                setStreamedCode(fullCode);
              }
            } catch {
              // Ignore parsing errors for streaming data
            }
          }
        }
      }

      setIsComplete(true);
      setIsStreaming(false);
      onComplete(fullCode);
    } catch (error) {
      console.error('Streaming error:', error);
      setIsStreaming(false);
    }
  };

  const exportCode = () => {
    if (!streamedCode) return;

    const blob = new Blob([streamedCode], { type: 'text/typescript' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'generated-tools.ts';
    a.click();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardDescription>Generate code for the components</CardDescription>
          </div>
          <div className="flex gap-2">
            {!isStreaming && !streamedCode && (
              <Button onClick={startStreaming}>
                Generate Code
              </Button>
            )}
            {streamedCode && (
              <Button variant="outline" onClick={exportCode}>
                Export Code
              </Button>
            )}
          </div>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Streaming...</Badge>
            <div className="text-sm text-muted-foreground">
              Code is being generated in real-time
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {(streamedCode || isStreaming) && (
          <div className="relative">
            {/* File header */}
            <div className="bg-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-mono text-gray-300 ml-2">generated-tools.ts</span>
              </div>
              {isStreaming && (
                <Badge variant="outline" className="bg-background text-xs">
                  AI SDK Streaming
                </Badge>
              )}
            </div>

            {/* Code content */}
            <div className="bg-gray-900 rounded-b-lg overflow-hidden">
              <pre className="p-4 overflow-x-auto text-sm max-h-96 font-mono leading-relaxed">
                <code
                  className="language-typescript text-gray-100"
                  dangerouslySetInnerHTML={{
                    __html: streamedCode ? formatCodeBlocks(streamedCode) : 'Generating code...'
                  }}
                />
                {isStreaming && <span className="animate-pulse text-green-400 ml-1">▊</span>}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
