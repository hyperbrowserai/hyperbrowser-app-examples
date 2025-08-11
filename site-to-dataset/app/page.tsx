'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import UrlForm from '@/components/UrlForm';
import LiveConsole from '@/components/LiveConsole';
import Table from '@/components/Table';
import DownloadBtn from '@/components/DownloadBtn';
import QAEditor from '@/components/QAEditor';
import { QAPair } from '@/lib/qa';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const handleSubmit = async (url: string, templateId: string, crawlMode: boolean, crawlOptions?: any) => {
    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    setQaPairs([]);
    setShowResults(false);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, templateId, crawlMode, crawlOptions }),
      });

      if (!response.ok) {
        throw new Error('Failed to process URL');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              if (data.type === 'log') {
                addLog(data.message);
              } else if (data.type === 'progress') {
                setProgress(data.progress);
              } else if (data.type === 'qaPair') {
                // Handle individual Q/A pairs as they come in
                setQaPairs(prev => [...prev, data.pair]);
                setShowResults(true);
              } else if (data.type === 'result') {
                setQaPairs(data.qaPairs);
                setShowResults(true);
              } else if (data.type === 'error') {
                addLog(`[ERROR] ${data.message}`);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      addLog(`[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
      >
        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="flex justify-center">
              <div className="flex items-center space-x-2  text-black px-4 py-2 rounded-full text-sm font-medium">
                <span>Powered by</span>
                <Image 
                  src="/hb.png" 
                  alt="Hyperbrowser" 
                  width={100} 
                  height={30} 
                  className="rounded-xl"
                />
              </div>
            </div>
            
            <h1 className="heading-xl max-w-4xl mx-auto">
              Transform Any Website Into
              <span className="block font-black"> LLM Training Data</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Turn documentation sites into high-quality Q/A datasets ready for fine-tuning. 
              Just paste a URL and get professional training data in minutes.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* URL Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-8"
        >
          <UrlForm onSubmit={handleSubmit} isProcessing={isProcessing} />
        </motion.div>

        {/* Progress Section */}
        {(isProcessing || logs.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mb-8"
          >
            <LiveConsole messages={logs} isVisible={logs.length > 0} />
          </motion.div>
        )}

        {/* Results Section */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Header with mode toggle */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="heading-lg">Generated Dataset</h2>
                  <p className="text-gray-600 mt-2">
                    Successfully created {qaPairs.length} high-quality Q/A pairs ready for training
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="status-badge status-success">
                    ✓ Complete
                  </div>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setEditMode(false)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        !editMode 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Quick View
                    </button>
                    <button
                      onClick={() => setEditMode(true)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        editMode 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Edit & Review
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content based on mode */}
            {editMode ? (
              <QAEditor 
                qaPairs={qaPairs} 
                onQAPairsChange={setQaPairs}
                onExport={(exportPairs) => {
                  // Create download for selected pairs
                  const blob = new Blob([JSON.stringify(exportPairs, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'dataset-edited.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              />
            ) : (
              <>
                <div className="bg-white rounded-3xl card-shadow-lg overflow-hidden border">
                  <Table data={qaPairs} isVisible={showResults} />
                </div>
                <DownloadBtn data={qaPairs} isVisible={showResults} />
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
