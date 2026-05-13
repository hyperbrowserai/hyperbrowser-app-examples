"use client";

import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Camera, Check, Download } from "lucide-react";
import type { Scorecard } from "@/lib/types";
import { ShareCard } from "./share-card";

interface ShareButtonProps {
  scorecard: Scorecard;
}

export function ShareButton({ scorecard }: ShareButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"copied" | "downloaded" | null>(null);

  const handle = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      if (!blob) throw new Error("failed to render");

      const canCopy =
        typeof navigator !== "undefined" &&
        "clipboard" in navigator &&
        typeof window !== "undefined" &&
        "ClipboardItem" in window;

      if (canCopy) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setFeedback("copied");
          setTimeout(() => setFeedback(null), 2000);
          return;
        } catch {
          // fall through to download
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hyperrank-${scorecard.companyName.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setFeedback("downloaded");
      setTimeout(() => setFeedback(null), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className="inline-flex items-center gap-2 bg-black text-white px-5 py-3 font-bold text-sm uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-all shadow-brutal hover:shadow-brutal-sm disabled:opacity-60"
      >
        {feedback === "copied" ? (
          <>
            <Check size={16} strokeWidth={3} />
            Copied to clipboard
          </>
        ) : feedback === "downloaded" ? (
          <>
            <Download size={16} strokeWidth={3} />
            Downloaded
          </>
        ) : (
          <>
            <Camera size={16} strokeWidth={3} />
            {busy ? "Rendering…" : "Share scorecard"}
          </>
        )}
      </button>

      <div
        aria-hidden
        style={{
          position: "fixed",
          left: -99999,
          top: 0,
          pointerEvents: "none",
        }}
      >
        <ShareCard ref={cardRef} scorecard={scorecard} />
      </div>
    </>
  );
}
