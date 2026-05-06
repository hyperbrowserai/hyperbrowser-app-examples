"use client";

import Image from "next/image";
import Link from "next/link";
import { KeyRound, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButtons } from "@/components/action-buttons";
import { ApiKeyInput } from "@/components/api-key-input";
import { CodeOutput } from "@/components/code-output";
import { DesignPreview } from "@/components/design-preview";
import { LoadingState, type LoadingPhase } from "@/components/loading-state";
import { UrlInput } from "@/components/url-input";
import {
  hostnameFromUrl,
  normalizeTargetUrl,
  pickBrandDisplayName,
} from "@/lib/format-design-md";
import { clearApiKey, getApiKey, hasApiKey } from "@/lib/storage";
import type { BrandingProfile } from "@/types";

interface DesignAppProps {
  initialDomain?: string | null;
  showApiKeyHint?: boolean;
  enforceRedirectWithoutKey?: boolean;
}

export function DesignApp({
  initialDomain = null,
  showApiKeyHint = false,
  enforceRedirectWithoutKey = false,
}: DesignAppProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [needsKeyGate, setNeedsKeyGate] = useState(true);
  const [urlInput, setUrlInput] = useState(initialDomain ?? "");
  const [loading, setLoading] = useState(false);
  const [loadPhase, setLoadPhase] = useState<LoadingPhase>("idle");
  const [error, setError] = useState("");
  const [designMd, setDesignMd] = useState("");
  const [branding, setBranding] = useState<BrandingProfile | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [lastSubmittedUrl, setLastSubmittedUrl] = useState("");

  const autoRan = useRef(false);

  useEffect(() => {
    setMounted(true);
    setNeedsKeyGate(!hasApiKey());
  }, []);

  useEffect(() => {
    if (!mounted || !enforceRedirectWithoutKey) return;
    if (!hasApiKey()) {
      router.replace("/?needApiKey=1");
    }
  }, [mounted, enforceRedirectWithoutKey, router]);

  const runGenerate = useCallback(
    async (rawInput: string) => {
      const apiKey = getApiKey();
      if (!apiKey) {
        setError("API key required");
        setNeedsKeyGate(true);
        return;
      }

      const trimmed = rawInput.trim();
      if (!trimmed) return;

      setError("");
      setDesignMd("");
      setBranding(null);
      setMetadata(null);
      setLoading(true);
      setLoadPhase("fetching");

      const targetUrl = normalizeTargetUrl(trimmed);
      setLastSubmittedUrl(targetUrl);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: targetUrl,
            apiKey,
          }),
        });

        const data = (await res.json()) as {
          error?: string;
          designMd?: string;
          branding?: BrandingProfile;
          metadata?: Record<string, unknown> | null;
        };

        if (!res.ok) {
          throw new Error(data.error || "Generation failed");
        }

        setLoadPhase("formatting");
        await Promise.resolve();
        setDesignMd(data.designMd ?? "");
        setBranding(data.branding ?? null);
        setMetadata(data.metadata ?? null);

        setLoadPhase("done");
        window.setTimeout(() => setLoadPhase("idle"), 900);

        if (pathname === "/") {
          const slug = hostnameFromUrl(targetUrl);
          window.history.replaceState(null, "", `/${encodeURIComponent(slug)}`);
        }
      } catch (e) {
        setLoadPhase("idle");
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [pathname],
  );

  useEffect(() => {
    if (!mounted || !initialDomain?.trim()) return;
    if (autoRan.current) return;
    if (!hasApiKey()) return;
    autoRan.current = true;
    setUrlInput(initialDomain);
    void runGenerate(initialDomain);
  }, [initialDomain, mounted, runGenerate]);

  const previewName = branding
    ? pickBrandDisplayName(metadata ?? undefined, lastSubmittedUrl)
    : "";

  const handleChangeKey = () => {
    clearApiKey();
    setNeedsKeyGate(true);
    autoRan.current = false;
    setDesignMd("");
    setBranding(null);
    setMetadata(null);
    setError("");
  };

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[url('/grid.svg')] bg-[#fafafa] text-black">
        <div className="flex items-center gap-3 border-4 border-black bg-white px-8 py-4 shadow-brutal">
          <span className="h-6 w-6 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <span className="text-xs font-black uppercase tracking-wider">Booting DESIGNMD</span>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#fafafa] bg-[url('/grid.svg')] pb-28 text-black selection:bg-black selection:text-white">
      <div className="absolute top-6 right-6 z-50">
        <a
          href="https://hyperbrowser.ai"
          target="_blank"
          rel="noreferrer"
          className="shadow-brutal-sm group inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition-all hover:-translate-y-0.5 hover:bg-black hover:text-white"
        >
          <KeyRound size={15} strokeWidth={2.5} aria-hidden />
          Get API key
        </a>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        {!loading && !designMd ? (
          <header className="mb-14 flex flex-col items-center">
            <div className="mb-7">
              <Image src="/logo.svg" alt="DESIGNMD mark" width={54} height={80} priority className="opacity-95" />
            </div>

            <h1 className="mb-5 text-center text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl">
              DESIGN
              <span className="bg-gradient-to-b from-gray-400 to-black bg-clip-text text-transparent">
                MD
              </span>
            </h1>

            <p className="max-w-2xl text-center text-lg font-bold leading-tight text-gray-600 sm:text-2xl">
              Extract a <span className="bg-gray-200 px-1.5 text-black">DESIGN.md</span> from any website.
            </p>

            <a
              href="https://hyperbrowser.ai"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex border-4 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.45em] text-black shadow-brutal-sm transition-colors hover:bg-black hover:text-white no-underline"
            >
              BUILT WITH HYPERBROWSER
            </a>

            <p className="mt-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Following Google&apos;s open standard
            </p>
          </header>
        ) : null}

        {showApiKeyHint && needsKeyGate ? (
          <div className="mx-auto mb-10 max-w-2xl border-4 border-amber-400 bg-amber-50 p-5 text-center text-sm font-bold uppercase tracking-wide text-amber-900 shadow-brutal">
            Add a Hyperbrowser API key below to unlock share URLs such as{" "}
            <span className="text-black">domain.com</span> paths on this install.
          </div>
        ) : null}

        {needsKeyGate ? (
          <ApiKeyInput
            onSaved={() => {
              setNeedsKeyGate(false);
            }}
          />
        ) : (
          <>
            <LoadingState phase={loadPhase} />

            <div className="mb-14">
              <UrlInput
                value={urlInput}
                onChange={setUrlInput}
                onGenerate={() => runGenerate(urlInput)}
                loading={loading}
              />
            </div>

            {error ? (
              <div className="mx-auto mb-10 max-w-3xl border-4 border-red-500 bg-red-50 p-5 shadow-brutal">
                <div className="mb-3 inline-flex border-2 border-red-500 bg-red-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  Error
                </div>
                <p className="text-lg font-bold leading-snug text-red-950">{error}</p>
              </div>
            ) : null}

            {designMd && branding ? (
              <div className="flex flex-col gap-12">
                <DesignPreview branding={branding} metadata={metadata} sourceUrl={lastSubmittedUrl} />
                <div className="flex min-h-[360px] flex-col overflow-hidden border-4 border-black bg-white shadow-brutal lg:min-h-[520px]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black px-5 py-3">
                    <div className="truncate font-mono text-[11px] font-bold uppercase tracking-widest text-gray-500">
                      {previewName.replace(/\s+/g, " ").trim()}
                    </div>
                    <ActionButtons designMd={designMd} filenameBase={hostnameFromUrl(lastSubmittedUrl)} />
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <CodeOutput content={designMd} />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}

        <footer className="mt-24 border-t border-gray-200 px-1 py-8 text-[11px] font-bold uppercase tracking-widest text-gray-500">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="https://github.com/google-labs-code/design.md"
              className="text-black underline-offset-4 hover:underline"
            >
              DESIGN.md specification
            </Link>
            {!needsKeyGate ? (
              <button 
                type="button" 
                className="inline-flex items-center gap-2 text-black transition-opacity hover:opacity-70" 
                onClick={handleChangeKey}
                title="Change API key"
              >
                <Settings size={16} strokeWidth={2.5} />
                <span>Settings</span>
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </main>
  );
}
