"use client";

import { useState } from "react";
import Image from "next/image";
import InputSection from "@/components/input-section";
import PreviewSection from "@/components/preview-section";
import { GenerateResponse } from "@/types";
import { Search, Database, FileText, Download, Key } from "lucide-react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
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

        {/* Input Section */}
        <div className="mb-20">
          <InputSection
            value={topic}
            onChange={setTopic}
            onGenerate={handleGenerate}
            loading={loading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-4 border-black bg-red-50 p-6 shadow-brutal flex items-start gap-4">
              <div className="bg-black text-white px-2 py-0.5 font-bold text-xs uppercase shrink-0 mt-1">Error</div>
              <p className="font-bold text-lg leading-tight">{error}</p>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {generatedContent && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <PreviewSection content={generatedContent} />
          </div>
        )}
      </div>
    </main>
  );
}
