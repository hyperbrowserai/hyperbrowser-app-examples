"use client";

import { SkillTreeResult } from "@/types";
import { useState, useCallback } from "react";
import { Download, Loader2, FileText, Share2 } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import CLITree from "./cli-tree";
import FileExplorer from "./file-explorer";
import FileViewer from "./file-viewer";
import GraphView from "./graph-view";

interface SkillTreeOutputProps {
  result: SkillTreeResult;
}

type ViewTab = "file" | "graph";

export default function SkillTreeOutput({ result }: SkillTreeOutputProps) {
  const [selectedFile, setSelectedFile] = useState<string>(
    result.files.find((f) => f.path === "index.md")?.path ||
      result.files[0]?.path ||
      ""
  );
  const [viewTab, setViewTab] = useState<ViewTab>("file");
  const [downloading, setDownloading] = useState(false);

  const handleSelectFile = useCallback((path: string) => {
    setSelectedFile(path);
    setViewTab("file");
  }, []);

  const handleGraphSelect = useCallback((path: string) => {
    setSelectedFile(path);
  }, []);

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(result.topic) || zip;

      for (const file of result.files) {
        folder.file(file.path, file.content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${result.topic}-skill-tree.zip`);
    } catch (error) {
      console.error("Failed to create ZIP:", error);
    } finally {
      setDownloading(false);
    }
  };

  const currentFile = result.files.find((f) => f.path === selectedFile);

  return (
    <div className="w-full max-w-7xl mx-auto mt-16">
      {/* CLI Tree */}
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CLITree topic={result.topic} files={result.files} />
      </div>

      {/* Explorer + Viewer Panel */}
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Header Bar */}
        <div className="sticky top-6 z-10 mb-[-4px]">
          <div className="bg-black text-white p-4 flex items-center justify-between border-4 border-black shadow-brutal border-b-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 font-mono text-sm text-gray-400">
                <FileText size={16} />
                <span>{result.topic}</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                <span>{result.files.length} files</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex border border-gray-700">
                <button
                  onClick={() => setViewTab("file")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                    viewTab === "file"
                      ? "bg-white text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <FileText size={12} />
                  File View
                </button>
                <button
                  onClick={() => setViewTab("graph")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                    viewTab === "graph"
                      ? "bg-white text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Share2 size={12} />
                  Graph View
                </button>
              </div>

              {/* Download */}
              <button
                onClick={handleDownloadZip}
                disabled={downloading}
                className="px-4 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating ZIP
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download .zip
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Two-Panel Layout */}
        <div className="grid grid-cols-[260px_1fr] border-4 border-black shadow-brutal bg-white min-h-[600px]">
          {/* Left: File Explorer */}
          <FileExplorer
            files={result.files}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
          />

          {/* Right: File Viewer or Graph */}
          <div className="h-[600px] overflow-hidden">
            {viewTab === "file" && currentFile ? (
              <FileViewer
                file={currentFile}
                allFiles={result.files}
                onNavigate={handleSelectFile}
              />
            ) : viewTab === "graph" ? (
              <GraphView
                files={result.files}
                selectedFile={selectedFile}
                onSelectFile={handleGraphSelect}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 font-mono text-sm">
                Select a file to view
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
