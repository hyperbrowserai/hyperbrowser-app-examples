'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';

interface ReasoningPanelProps {
  reasoning: string[] | null;
  metadata: any;
  nodeToReasoning: { [key: string]: number[] };
  selectedNode: string | null;
  onReasoningClick: (nodeId: string | null) => void;
}

function parseReasoningLine(line: string) {
  const colonIndex = line.indexOf(':');
  if (colonIndex !== -1) {
    const label = line.substring(0, colonIndex).trim();
    const content = line.substring(colonIndex + 1).trim();
    return { label, content };
  }
  return { label: null, content: line };
}

function getNodeIdForReasoningIndex(nodeToReasoning: { [key: string]: number[] }, index: number): string | null {
  for (const [nodeId, indices] of Object.entries(nodeToReasoning)) {
    if (indices.includes(index)) {
      return nodeId;
    }
  }
  return null;
}

export default function ReasoningPanel({ 
  reasoning, 
  metadata, 
  nodeToReasoning, 
  selectedNode, 
  onReasoningClick 
}: ReasoningPanelProps) {
  const isReasoningHighlighted = (index: number) => {
    if (!selectedNode) return true;
    const reasoningIndices = nodeToReasoning[selectedNode] || [];
    return reasoningIndices.includes(index);
  };

  const handleReasoningClick = (index: number) => {
    const nodeId = getNodeIdForReasoningIndex(nodeToReasoning, index);
    if (nodeId) {
      if (selectedNode === nodeId) {
        onReasoningClick(null);
      } else {
        onReasoningClick(nodeId);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
      className="h-full overflow-y-auto p-6 space-y-6 bg-black border-l border-white/10"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-xs text-white/60">ANALYSIS TRACE</h3>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="font-mono text-[10px] text-white/40"
            >
              FOCUSED
            </motion.div>
          )}
        </div>
        <Card className="bg-black border-white/10 p-4">
          {reasoning && reasoning.length > 0 ? (
            <div className="space-y-4">
              {reasoning.map((line, index) => {
                const { label, content } = parseReasoningLine(line);
                const isHighlighted = isReasoningHighlighted(index);
                const nodeId = getNodeIdForReasoningIndex(nodeToReasoning, index);
                const isClickable = nodeId !== null;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ 
                      opacity: isHighlighted ? 1 : 0.3,
                      x: 0,
                      scale: isHighlighted ? 1 : 0.98
                    }}
                    transition={{ duration: 0.3 }}
                    onClick={() => isClickable && handleReasoningClick(index)}
                    className={`flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0 transition-all ${
                      isClickable ? 'cursor-pointer hover:bg-white/5 -mx-2 px-2 rounded' : ''
                    } ${isHighlighted && selectedNode ? 'bg-white/5 -mx-2 px-2 rounded' : ''}`}
                  >
                    <span className={`font-mono text-[10px] mt-0.5 min-w-[20px] transition-colors ${
                      isHighlighted ? 'text-white/30' : 'text-white/10'
                    }`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      {label ? (
                        <>
                          <div className={`font-mono text-[10px] mb-1 tracking-wide transition-colors ${
                            isHighlighted ? 'text-white/50' : 'text-white/20'
                          }`}>
                            {label}
                          </div>
                          <div className={`font-sans text-sm leading-relaxed transition-colors ${
                            isHighlighted ? 'text-white/90' : 'text-white/30'
                          }`}>
                            {content}
                          </div>
                        </>
                      ) : (
                        <div className={`font-sans text-sm leading-relaxed transition-colors ${
                          isHighlighted ? 'text-white/90' : 'text-white/30'
                        }`}>
                          {content}
                        </div>
                      )}
                    </div>
                    {isClickable && isHighlighted && (
                      <div className="text-white/20 text-[10px] mt-1">→</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="font-mono text-xs text-white/40">
              NO ANALYSIS DATA
            </p>
          )}
        </Card>
      </div>

      {metadata && (
        <div>
          <h3 className="font-mono text-xs text-white/60 mb-4">PAGE METADATA</h3>
          <Card className="bg-black border-white/10 p-4">
            <div className="space-y-4">
              {metadata.title && (
                <div>
                  <span className="font-mono text-[10px] text-white/40 tracking-wide">TITLE</span>
                  <p className="font-sans text-sm text-white mt-1.5 leading-relaxed">{metadata.title}</p>
                </div>
              )}
              {metadata.description && (
                <div className="pt-2 border-t border-white/5">
                  <span className="font-mono text-[10px] text-white/40 tracking-wide">DESCRIPTION</span>
                  <p className="font-sans text-sm text-white/80 mt-1.5 leading-relaxed">{metadata.description}</p>
                </div>
              )}
              {metadata.url && (
                <div className="pt-2 border-t border-white/5">
                  <span className="font-mono text-[10px] text-white/40 tracking-wide">URL</span>
                  <p className="font-mono text-xs text-white/60 mt-1.5 break-all">{metadata.url}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
