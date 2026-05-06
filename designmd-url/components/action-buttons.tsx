"use client";

import { Copy, Download } from "lucide-react";
import { useState } from "react";

interface ActionButtonsProps {
  designMd: string;
  filenameBase: string;
}

export function ActionButtons({ designMd, filenameBase }: ActionButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(designMd);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const safe = filenameBase.replace(/[^a-zA-Z0-9._-]+/g, "-") || "site";
    const blob = new Blob([designMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DESIGN-${safe}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap justify-end gap-3">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 border-4 border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-black hover:bg-gray-100"
      >
        <Copy size={16} strokeWidth={2.5} aria-hidden />
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-2 border-4 border-black bg-black px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-gray-800"
      >
        <Download size={16} strokeWidth={2.5} aria-hidden />
        Download
      </button>
    </div>
  );
}
