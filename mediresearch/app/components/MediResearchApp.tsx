'use client';

import { useState, useCallback } from 'react';
import { BloodTest, AnalysisInsight, ResearchArticle } from '@/lib/types';
import FileUpload from './FileUpload';
import ResultsTable from './ResultsTable';
import AnalysisPanel from './AnalysisPanel';
import EvidenceModal from './EvidenceModal';
import LoadingSpinner from './LoadingSpinner';
import Background from './Background';
import { exportToPDF } from '@/lib/pdfExport';
import Image from 'next/image';

interface AppState {
  step: 'upload' | 'processing' | 'results';
  tests: BloodTest[];
  insights: AnalysisInsight[];
  research: ResearchArticle[];
  evidence: string;
  summary: string;
  error: string | null;
}

export default function MediResearchApp() {
  const [state, setState] = useState<AppState>({
    step: 'upload',
    tests: [],
    insights: [],
    research: [],
    evidence: '',
    summary: '',
    error: null,
  });

  const [showEvidence, setShowEvidence] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [, setProcessingProgress] = useState(0);

  const handleFileUpload = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, step: 'processing', error: null }));

    try {
      // Step 1: Extract blood test results
      setProcessingStep('Extracting blood test results...');
      setProcessingProgress(10);

      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const fileType = file.type === 'application/pdf' ? 'pdf' : 
                      file.type === 'text/html' ? 'html' : 
                      file.type === 'text/plain' ? 'txt' : 'csv';

      const resultsResponse = await fetch('/api/fetchResults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: fileBase64,
          fileType,
        }),
      });

      if (!resultsResponse.ok) {
        const error = await resultsResponse.json();
        throw new Error(error.error || 'Failed to extract results');
      }

      const resultsData = await resultsResponse.json();
      setProcessingProgress(33);

      // Step 2: Fetch research with dedupe, prioritization, and limited concurrency
      setProcessingStep('Fetching medical research...');

      // Deduplicate tests by name (case-insensitive) and prioritize abnormal
      const nameToTest = new Map<string, BloodTest>();
      for (const t of resultsData.tests) {
        const key = t.name.trim().toLowerCase();
        if (!nameToTest.has(key)) nameToTest.set(key, t);
      }

      const severityRank = (status?: string) => {
        const s = (status || 'normal').toLowerCase();
        if (s === 'critical') return 0;
        if (s === 'high') return 1;
        if (s === 'low') return 2;
        return 3; // normal
      };

      const uniqueTests = Array.from(nameToTest.values())
        .filter(t => (t.status || 'normal') !== 'normal') // Skip research for normal tests
        .sort((a, b) => severityRank(a.status) - severityRank(b.status));

      // Concurrency limiter (reduced for speed)
      const concurrency = 2;
      let index = 0;
      const collected: ResearchArticle[] = [];
      async function worker() {
        while (true) {
          const current = index++;
          if (current >= uniqueTests.length) break;
          const test = uniqueTests[current];
          try {
            const researchResponse = await fetch('/api/fetchResearch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ testName: test.name, testValue: test.value }),
            });
            if (researchResponse.ok) {
              const researchData = await researchResponse.json();
              collected.push(...(researchData.articles || []));
            }
          } catch (err) {
            console.error('research fetch failed for', test.name, err);
          }
          // Update progress roughly across research phase
          const pct = 33 + Math.round(((current + 1) / uniqueTests.length) * 33);
          setProcessingProgress(Math.min(65, pct));
        }
      }
      const workers = Array.from({ length: Math.min(concurrency, uniqueTests.length) }, () => worker());
      await Promise.all(workers);

      const allResearch = collected;
      setProcessingProgress(66);

      // Step 3: Analyze results
      setProcessingStep('Generating AI analysis...');

      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: resultsData.tests,
          research: allResearch,
        }),
      });

      if (!analyzeResponse.ok) {
        const error = await analyzeResponse.json();
        throw new Error(error.error || 'Failed to analyze results');
      }

      const analyzeData = await analyzeResponse.json();
      setProcessingProgress(100);

      setState({
        step: 'results',
        tests: resultsData.tests,
        insights: analyzeData.insights,
        research: allResearch,
        evidence: resultsData.evidence.md,
        summary: analyzeData.summary,
        error: null,
      });

    } catch (error) {
      console.error('Processing error:', error);
      setState(prev => ({
        ...prev,
        step: 'upload',
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  }, []);

  const handleReset = useCallback(() => {
    setState({
      step: 'upload',
      tests: [],
      insights: [],
      research: [],
      evidence: '',
      summary: '',
      error: null,
    });
  }, []);

  const handleExportPDF = useCallback(async () => {
    try {
      await exportToPDF({
        tests: state.tests,
        insights: state.insights,
        summary: state.summary,
      });
    } catch (error) {
      console.error('PDF export error:', error);
    }
  }, [state.tests, state.insights, state.summary]);

  return (
    <>
      {/* Parallax Dots Background */}
      <Background />

      {/* Main App Content */}
      <div className="min-h-screen text-white relative z-10">
        <div className="min-h-screen flex flex-col">
          {state.step === 'upload' && (
            <>
              <div className="absolute top-12 left-12">
                <div className="flex items-center space-x-2">
                    <Image src="/hb-wordmark.svg" alt="hyperbrowser" width={140} height={100} />
                </div>
              </div>

              <div className="absolute top-30 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center space-x-2 px-4 py-3 rounded-xl border border-[#424242]"
                  style={{
                    background: 'linear-gradient(90deg, #111011 0%, #222222 100%)'
                  }}>
                  <span className="text-sm text-gray-200">Powered by</span>
                  <span className="text-[#F0FF26] font-semibold">

                    <Image src="/hb-wordmark.svg" alt="hyperbrowser" width={100} height={100} />
                  </span>
                </div>
              </div>

              {/* Main content - centered */}
              <div className="flex-1 flex items-center justify-center px-8">
                <div className="text-center max-w-2xl">
                  {/* Main heading with gradient */}
                  <h1 className="text-6xl text-heading mb-4 inline-block text-transparent bg-clip-text"
                    style={{
                      backgroundImage: 'linear-gradient(to right, white 0%, white 85%, rgba(237, 246, 121, 0.86) 100%)'
                    }}>
                    Deep-Analyze
                  </h1>
                  <h2 className="text-6xl text-heading mb-12 inline-block text-transparent bg-clip-text"
                    style={{
                      backgroundImage: 'linear-gradient(to right, white 0%, white 65%, rgba(236, 245, 116, 0.79) 100%)'
                    }}>
                    Blood test results
                  </h2>

                
                  <p className="text-gray-400 text-md mb-16 text-mono">
                    UNDERSTAND YOUR BLOOD TEST RESULTS WITH LIVE
                    <br />
                    MEDICAL REFERENCES & DEEP-RESEARCH WITH AI
                  </p>

                  <FileUpload onFileUpload={handleFileUpload} error={state.error} />
                </div>
              </div>
            </>
          )}

          {state.step === 'processing' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <LoadingSpinner />
                <p className="text-gray-400 mt-6 text-lg">{processingStep}</p>
              </div>
            </div>
          )}

          {state.step === 'results' && (
            <div className="flex-1 p-8">
              <div className="max-w-7xl mx-auto space-y-8">
                {/* Dashboard header */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Dashboard</h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleExportPDF}
                      className="px-4 py-2 bg-[#F0FF26] text-black rounded hover:bg-[#F0FF26]/90 transition-colors font-medium"
                    >
                      Download Report
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 border border-gray-600 rounded hover:bg-gray-800 transition-colors"
                    >
                      New Analysis
                    </button>
                  </div>
                </div>

                {/* Compute quick stats */}
                {(() => {
                  const total = state.tests.length;
                  const normal = state.tests.filter(t => (t.status || 'normal') === 'normal').length;
                  const abnormal = total - normal;
                  const normalPct = total ? Math.round((normal / total) * 100) : 100;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Overall snapshot */}
                      <div className="md:col-span-4 bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800/60 p-6">
                        <h3 className="text-lg font-semibold mb-4">Overall Snapshot</h3>
                        <div className="flex items-end justify-between mb-6">
                          <div>
                            <div className="text-4xl font-semibold">{total}</div>
                            <div className="text-gray-400 text-sm">Tests analyzed</div>
                          </div>
                          <div className="relative w-20 h-20">
                            <div
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: `conic-gradient(#F0FF26 ${normalPct}%, rgba(255,255,255,0.08) ${normalPct}% 100%)`
                              }}
                            />
                            <div className="absolute inset-2 rounded-full bg-black/60 flex items-center justify-center text-sm">
                              {normalPct}%
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-gray-800/40 rounded-lg p-3 text-center border border-gray-800/60">
                            <div className="text-xl font-semibold">{normal}</div>
                            <div className="text-gray-400 text-xs">Normal</div>
                          </div>
                          <div className="bg-gray-800/40 rounded-lg p-3 text-center border border-gray-800/60">
                            <div className="text-xl font-semibold">{abnormal}</div>
                            <div className="text-gray-400 text-xs">Abnormal</div>
                          </div>
                          <div className="bg-gray-800/40 rounded-lg p-3 text-center border border-gray-800/60">
                            <div className="text-xl font-semibold">0</div>
                            <div className="text-gray-400 text-xs">Flags</div>
                          </div>
                        </div>
                      </div>

                      {/* Summary card */}
                      <div className="md:col-span-4 bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800/60 p-6">
                        <h3 className="text-lg font-semibold mb-4">Summary</h3>
                        <p className="text-gray-300 leading-relaxed">
                          {state.summary || 'No summary available.'}
                        </p>
                      </div>

                      {/* Quick actions */}
                      <div className="md:col-span-4 bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800/60 p-6">
                        <h3 className="text-lg font-semibold mb-4">Actions</h3>
                        <div className="space-y-3">
                          <button
                            onClick={() => setShowEvidence(true)}
                            className="w-full px-4 py-3 border border-gray-700 rounded hover:bg-gray-800 transition-colors text-left"
                          >
                            View Evidence
                          </button>
                          <button
                            onClick={handleExportPDF}
                            className="w-full px-4 py-3 bg-[#F0FF26] text-black rounded hover:bg-[#F0FF26]/90 transition-colors text-left font-medium"
                          >
                            Download PDF
                          </button>
                          <button
                            onClick={handleReset}
                            className="w-full px-4 py-3 border border-gray-700 rounded hover:bg-gray-800 transition-colors text-left"
                          >
                            Start New Analysis
                          </button>
                        </div>
                      </div>

                      {/* Results table */}
                      <div className="md:col-span-7">
                        <ResultsTable tests={state.tests} />
                      </div>

                      {/* Insights panel */}
                      <div className="md:col-span-5">
                        <AnalysisPanel insights={state.insights} summary={state.summary} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Evidence Modal */}
        <EvidenceModal
          isOpen={showEvidence}
          onClose={() => setShowEvidence(false)}
          evidence={state.evidence}
        />
      </div>
    </>
  );
}
