"use client";

import { useState } from "react";
import Image from "next/image";
import UrlInput from "@/components/url-input";
import CodeOutput from "@/components/code-output";
import DesignPreview from "@/components/design-preview";
import type { DesignTokens, PageCopy } from "@/types";
import { Key, Camera } from "lucide-react";

const LOADING_STEPS = [
  "Capturing viewport & scraping styles...",
  "Analyzing visual design with Opus 4.7...",
] as const;

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [designMd, setDesignMd] = useState("");
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [pageCopy, setPageCopy] = useState<PageCopy | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState("");
  const [fullPageDataUrl, setFullPageDataUrl] = useState("");
  const [error, setError] = useState("");

  const loadingLabel = LOADING_STEPS[stepIdx];

  const handleGenerate = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setStepIdx(0);
    setError("");
    setDesignMd("");
    setTokens(null);
    setPageCopy(null);
    setScreenshotDataUrl("");
    setFullPageDataUrl("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "step") {
            setStepIdx(event.step);
          } else if (event.type === "screenshot") {
            setScreenshotDataUrl(`data:image/png;base64,${event.data}`);
          } else if (event.type === "fullpage") {
            setFullPageDataUrl(`data:image/png;base64,${event.data}`);
          } else if (event.type === "result") {
            setDesignMd(event.designMd);
            setTokens(event.tokens);
            if (event.pageCopy) setPageCopy(event.pageCopy);
          } else if (event.type === "error") {
            throw new Error(event.error);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] bg-[url('/grid.svg')] text-black font-sans selection:bg-black selection:text-white pb-24 relative">
      <div className="absolute top-6 right-6 z-50">
        <a
          href="https://hyperbrowser.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 bg-black text-white px-4 py-2 font-bold text-sm uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all shadow-brutal-sm hover:shadow-brutal hover:-translate-y-0.5"
        >
          <Key size={16} strokeWidth={2.5} />
          <span>Get API Key</span>
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
        <header className="flex flex-col items-center mb-16 relative">
          <div className="mb-8 text-black">
            <Image
              src="/logo.svg"
              alt=""
              width={60}
              height={96}
              className="text-black"
              priority
            />
          </div>
          <h1 className="text-6xl md:text-8xl font-semibold tracking-tighter mb-4 text-center leading-[0.9] text-black">
            HYPER
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-black">
              DESIGN
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-gray-500 max-w-2xl text-center leading-tight">
            Extract a{" "}
            <span className="text-black font-bold bg-gray-200 px-1 border border-gray-300">
              DESIGN.md
            </span>{" "}
            from any website. Colors, typography, and spacing — in one file.
          </p>

          <div className="mt-6 text-sm font-bold uppercase tracking-widest text-gray-400">
            Built with{" "}
            <a
              href="https://hyperbrowser.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white transition-all px-1"
            >
              Hyperbrowser
            </a>
          </div>
        </header>

        <div className="mb-10">
          <UrlInput
            value={url}
            onChange={setUrl}
            onGenerate={handleGenerate}
            loading={loading}
            loadingLabel={loadingLabel}
          />
        </div>

        {loading && (
          <div className="max-w-4xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-4 border-black bg-white p-6 shadow-brutal">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-lg font-mono text-black">
                  {loadingLabel}
                </p>
              </div>
              <ol className="font-mono text-xs text-gray-500 space-y-1 uppercase tracking-wide">
                {LOADING_STEPS.map((label, i) => (
                  <li
                    key={label}
                    className={
                      i <= stepIdx ? "text-black" : "text-gray-400"
                    }
                  >
                    {i + 1}. {label}
                  </li>
                ))}
              </ol>

              {screenshotDataUrl && !designMd && (
                <div className="mt-6 border-t-2 border-gray-200 pt-6 animate-in fade-in">
                  <h3 className="font-bold text-sm uppercase tracking-wider font-mono mb-3 flex items-center gap-2 text-black">
                    <Camera size={16} />
                    Captured Viewport
                  </h3>
                  <div className="border-2 border-black bg-gray-50 overflow-hidden relative">
                    <div className="absolute inset-0 bg-white/40 animate-pulse z-10 flex items-center justify-center">
                       <span className="bg-black text-white px-4 py-2 text-sm font-bold uppercase tracking-wider shadow-brutal-sm">Analyzing Visuals...</span>
                    </div>
                    <Image
                      src={screenshotDataUrl}
                      alt="Captured viewport"
                      width={960}
                      height={540}
                      unoptimized
                      className="w-full h-auto block opacity-60"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-4 border-black bg-red-50 p-6 shadow-brutal flex items-start gap-4">
              <div className="bg-black text-white px-2 py-0.5 font-bold text-xs uppercase shrink-0 mt-1">
                Error
              </div>
              <p className="font-bold text-lg leading-tight font-mono text-black">
                {error}
              </p>
            </div>
          </div>
        )}

        {designMd && screenshotDataUrl && (
          <div
            className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700"
            data-output
          >
            <DesignPreview tokens={tokens} screenshotDataUrl={screenshotDataUrl} fullPageDataUrl={fullPageDataUrl} pageCopy={pageCopy} />
            <CodeOutput content={designMd} />
          </div>
        )}
      </div>
    </main>
  );
}
