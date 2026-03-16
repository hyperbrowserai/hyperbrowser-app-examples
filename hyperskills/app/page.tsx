"use client";

import { useState } from "react";
import Image from "next/image";
import InputSection from "@/components/input-section";
import BatchInputSection from "@/components/batch-input-section";
import BatchResultsSection from "@/components/batch-results-section";
import PreviewSection from "@/components/preview-section";
import SkillTreeOutput from "@/components/skill-tree/skill-tree-output";
import { GenerateResponse, BatchResult, SkillTreeResult } from "@/types";
import { Key, Zap, List, GitBranch } from "lucide-react";

type Mode = "single" | "batch" | "tree";

export default function Home() {
  const [mode, setMode] = useState<Mode>("single");
  const [topic, setTopic] = useState("");
  const [treeTopic, setTreeTopic] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [skillTreeResult, setSkillTreeResult] = useState<SkillTreeResult | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!topic.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedContent("");

    try {
      const isUrl = topic.startsWith("http://") || topic.startsWith("https://");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [isUrl ? "url" : "topic"]: topic,
        }),
      });

      const data: GenerateResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate SKILL.md");
      }

      setGeneratedContent(data.content);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error("Error generating skill:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    const urls = batchUrls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && (line.startsWith("http://") || line.startsWith("https://")));

    if (urls.length === 0) {
      setError("Please enter at least one valid URL");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedContent("");
    
    // Initialize results with processing status
    const initialResults: BatchResult[] = urls.map((url) => ({
      url,
      content: "",
      status: "processing",
    }));
    setBatchResults(initialResults);

    try {
      // Use Hyperbrowser's native batch API via our batch endpoint
      const response = await fetch("/api/generate-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate skills");
      }

      // Update results with the batch response
      const finalResults: BatchResult[] = data.results.map((result: BatchResult) => ({
        url: result.url,
        content: result.content || "",
        status: result.success ? "success" as const : "error" as const,
        error: result.error,
        duration: result.duration,
      }));

      setBatchResults(finalResults);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      
      // Update all to error status
      setBatchResults((prev) =>
        prev.map((r) => ({ ...r, status: "error" as const, error: errorMessage }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (result: BatchResult) => {
    setGeneratedContent(result.content || "");
    // Scroll to preview
    setTimeout(() => {
      const previewElement = document.querySelector('[data-preview]');
      if (previewElement) {
        previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleTreeGenerate = async () => {
    if (!treeTopic.trim()) return;

    setLoading(true);
    setError("");
    setSkillTreeResult(null);
    setLoadingStage("Searching documentation...");

    try {
      const isUrl =
        treeTopic.startsWith("http://") || treeTopic.startsWith("https://");

      setLoadingStage(
        isUrl ? "Scraping source..." : "Searching documentation..."
      );

      const response = await fetch("/api/skill-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [isUrl ? "url" : "topic"]: treeTopic,
        }),
      });

      setLoadingStage("Building skill tree...");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate skill tree");
      }

      setSkillTreeResult(data.tree);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error("Error generating skill tree:", err);
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setGeneratedContent("");
    setBatchResults([]);
    setSkillTreeResult(null);
    setLoadingStage("");
  };

  return (
    <main className="min-h-screen bg-[#fafafa] bg-[url('/grid.svg')] text-black font-sans selection:bg-black selection:text-white pb-24 relative">
      
      {/* Navbar CTA */}
      <div className="absolute top-6 right-6 z-50">
        <a 
          href="https://hyperbrowser.ai" 
          target="_blank" 
          className="group flex items-center gap-2 bg-black text-white px-4 py-2 font-bold text-sm uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all shadow-brutal-sm hover:shadow-brutal hover:-translate-y-0.5"
        >
          <Key size={16} strokeWidth={2.5} />
          <span>Get API Key</span>
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
        
        {/* Header */}
        <header className="flex flex-col items-center mb-16 relative">
          <div className="mb-8">
            <Image
              src="/logo.svg"
              alt="HyperSkill Logo"
              width={60}
              height={96}
              className="text-black"
              priority
            />
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-center leading-[0.9]">
            HYPER<span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-black">SKILL</span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-gray-500 max-w-2xl text-center leading-tight">
            Auto-generate <span className="text-black font-bold bg-gray-200 px-1">SKILL.md</span> documentation for your AI agents from any web source.
          </p>
          
          <div className="mt-6 text-sm font-bold uppercase tracking-widest text-gray-400">
            Built with <a href="https://hyperbrowser.ai" target="_blank" className="text-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white transition-all px-1">Hyperbrowser</a>
          </div>
        </header>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex border-4 border-black shadow-brutal bg-white">
            <button
              onClick={() => handleModeSwitch("single")}
              className={`px-8 py-4 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                mode === "single"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <Zap size={18} strokeWidth={2.5} />
              Single Skill
            </button>
            <div className="w-[4px] bg-black" />
            <button
              onClick={() => handleModeSwitch("batch")}
              className={`px-8 py-4 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                mode === "batch"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <List size={18} strokeWidth={2.5} />
              Batch Mode
            </button>
            <div className="w-[4px] bg-black" />
            <button
              onClick={() => handleModeSwitch("tree")}
              className={`px-8 py-4 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                mode === "tree"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <GitBranch size={18} strokeWidth={2.5} />
              Skill Tree
            </button>
          </div>
        </div>

        {/* Input Section - Conditional based on mode */}
        <div className="mb-20">
          {mode === "single" ? (
            <InputSection
              value={topic}
              onChange={setTopic}
              onGenerate={handleGenerate}
              loading={loading}
            />
          ) : mode === "batch" ? (
            <BatchInputSection
              value={batchUrls}
              onChange={setBatchUrls}
              onGenerate={handleBatchGenerate}
              loading={loading}
            />
          ) : (
            <InputSection
              value={treeTopic}
              onChange={setTreeTopic}
              onGenerate={handleTreeGenerate}
              loading={loading}
            />
          )}
        </div>

        {/* Loading Stage Indicator (Skill Tree) */}
        {mode === "tree" && loading && loadingStage && (
          <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-4 border-black bg-white p-6 shadow-brutal flex items-center gap-4">
              <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-lg">{loadingStage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-4 border-black bg-red-50 p-6 shadow-brutal flex items-start gap-4">
              <div className="bg-black text-white px-2 py-0.5 font-bold text-xs uppercase shrink-0 mt-1">Error</div>
              <p className="font-bold text-lg leading-tight">{error}</p>
            </div>
          </div>
        )}

        {/* Batch Results Section */}
        {mode === "batch" && batchResults.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <BatchResultsSection results={batchResults} onPreview={handlePreview} />
          </div>
        )}

        {/* Preview Section */}
        {generatedContent && (mode === "single" || mode === "batch") && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700" data-preview>
            <PreviewSection content={generatedContent} />
          </div>
        )}

        {/* Skill Tree Output */}
        {mode === "tree" && skillTreeResult && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <SkillTreeOutput result={skillTreeResult} />
          </div>
        )}
      </div>
    </main>
  );
}
