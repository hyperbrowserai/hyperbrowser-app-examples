'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import UrlInput from '@/components/UrlInput';
import MirrorFrame from '@/components/MirrorFrame';
import BrainGraph from '@/components/BrainGraph';
import ReasoningPanel from '@/components/ReasoningPanel';
import RecommendationsPanel from '@/components/RecommendationsPanel';
import { GraphData } from '@/lib/hyperbrowser';

interface AnalysisResult {
  graph: GraphData;
  reasoning: string[];
  metadata: any;
  nodeToReasoning: { [key: string]: number[] };
}

export default function Home() {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareUrl, setCompareUrl] = useState<string>('');
  const [compareResult, setCompareResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      const result = {
        graph: data.graph,
        reasoning: data.reasoning,
        metadata: data.metadata,
        nodeToReasoning: data.nodeToReasoning || {},
      };

      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareAnalyze = async () => {
    if (!targetUrl.trim() || !compareUrl.trim()) {
      setError('Please enter both URLs to compare');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Analyze both URLs in parallel
      const [response1, response2] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        }),
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: compareUrl }),
        }),
      ]);

      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json(),
      ]);

      if (!response1.ok) throw new Error(data1.error || 'URL 1 analysis failed');
      if (!response2.ok) throw new Error(data2.error || 'URL 2 analysis failed');

      setAnalysisResult({
        graph: data1.graph,
        reasoning: data1.reasoning,
        metadata: data1.metadata,
        nodeToReasoning: data1.nodeToReasoning || {},
      });

      setCompareResult({
        graph: data2.graph,
        reasoning: data2.reasoning,
        metadata: data2.metadata,
        nodeToReasoning: data2.nodeToReasoning || {},
      });
    } catch (err: any) {
      setError(err.message);
      console.error('Comparison error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="border-b border-white/10 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="HyperVision" className="h-8 w-auto" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">HyperVision</h1>
              <p className="font-mono text-xs text-white/60 mt-1">
                AI PERCEPTION ANALYSIS SYSTEM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                if (compareMode) {
                  setCompareUrl('');
                  setCompareResult(null);
                }
              }}
              className={`font-mono text-[10px] px-3 py-1.5 border rounded transition-colors ${
                compareMode 
                  ? 'bg-white text-black border-white' 
                  : 'text-white/60 border-white/10 hover:border-white/30'
              }`}
            >
              {compareMode ? 'EXIT COMPARE' : 'COMPARE MODE'}
            </button>
            <div className="text-right">
              <p className="font-mono text-xs text-white/40">
                Built with{' '}
                <a
                  href="https://hyperbrowser.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:underline"
                >
                  Hyperbrowser
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      {compareMode ? (
        <div className="border-b border-white/10">
          <div className="grid grid-cols-2 gap-px bg-white/5">
            <UrlInput 
              onAnalyze={() => {}}
              isLoading={isLoading}
              placeholder="ENTER URL 1"
              showButton={false}
              value={targetUrl}
              onChange={setTargetUrl}
            />
            <UrlInput 
              onAnalyze={() => {}}
              isLoading={isLoading}
              placeholder="ENTER URL 2"
              showButton={false}
              value={compareUrl}
              onChange={setCompareUrl}
            />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center p-4 border-t border-white/5"
          >
            <button
              onClick={handleCompareAnalyze}
              disabled={isLoading || !targetUrl.trim() || !compareUrl.trim()}
              className="px-12 py-2 bg-white text-black hover:bg-white/90 font-mono text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'ANALYZING BOTH...' : 'ANALYZE BOTH'}
            </button>
          </motion.div>
        </div>
      ) : (
        <UrlInput onAnalyze={handleAnalyze} isLoading={isLoading} />
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-3 bg-red-950/30 border-b border-red-900/30"
        >
          <p className="font-mono text-xs text-red-400">ERROR: {error}</p>
        </motion.div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {compareMode ? (
          <>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-1/2 flex flex-col border-r border-white/10"
            >
              <div className="p-3 border-b border-white/10 bg-white/5">
                <p className="font-mono text-[10px] text-white/60">URL 1</p>
              </div>
              <div className="flex-1 flex">
                <div className="w-2/3">
                  <BrainGraph 
                    data={analysisResult?.graph || null}
                    selectedNode={selectedNode}
                    onNodeClick={setSelectedNode}
                  />
                </div>
                <div className="w-1/3 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    <ReasoningPanel
                      reasoning={analysisResult?.reasoning || null}
                      metadata={analysisResult?.metadata || null}
                      nodeToReasoning={analysisResult?.nodeToReasoning || {}}
                      selectedNode={selectedNode}
                      onReasoningClick={(nodeId) => setSelectedNode(nodeId)}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="w-1/2 flex flex-col"
            >
              <div className="p-3 border-b border-white/10 bg-white/5">
                <p className="font-mono text-[10px] text-white/60">URL 2</p>
              </div>
              <div className="flex-1 flex">
                <div className="w-2/3">
                  <BrainGraph 
                    data={compareResult?.graph || null}
                    selectedNode={selectedNode}
                    onNodeClick={setSelectedNode}
                  />
                </div>
                <div className="w-1/3 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    <ReasoningPanel
                      reasoning={compareResult?.reasoning || null}
                      metadata={compareResult?.metadata || null}
                      nodeToReasoning={compareResult?.nodeToReasoning || {}}
                      selectedNode={selectedNode}
                      onReasoningClick={(nodeId) => setSelectedNode(nodeId)}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-1/2 border-r border-white/10"
            >
              <MirrorFrame url={targetUrl || null} />
            </motion.div>

            <div className="w-1/2 flex flex-col">
              <div className="flex-1 flex overflow-hidden">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="w-2/3"
                >
                  <BrainGraph 
                    data={analysisResult?.graph || null}
                    selectedNode={selectedNode}
                    onNodeClick={setSelectedNode}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="w-1/3 overflow-y-auto"
                >
                  <ReasoningPanel
                    reasoning={analysisResult?.reasoning || null}
                    metadata={analysisResult?.metadata || null}
                    nodeToReasoning={analysisResult?.nodeToReasoning || {}}
                    selectedNode={selectedNode}
                    onReasoningClick={(nodeId) => setSelectedNode(nodeId)}
                  />
                </motion.div>
              </div>

              {analysisResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="border-t border-white/10 max-h-64 overflow-y-auto"
                >
                  <RecommendationsPanel
                    graph={analysisResult.graph}
                    metadata={analysisResult.metadata}
                  />
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="text-center space-y-4">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-16 h-16 mx-auto border-2 border-white rounded-full glow"
            />
            <p className="font-mono text-sm text-white">ANALYZING...</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
