"use client";

import {
  SkillTreeFile,
  SkillTreeResult,
  GenerationStatus,
  DiscoveryNode,
} from "@/lib/types";
import { useState, useCallback } from "react";
import { Download, Loader2, FileText, Share2 } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import FileExplorer from "./FileExplorer";
import FileViewer from "./FileViewer";
import GraphView from "./GraphView";
import CLITree from "./CliTree";
import DiscoveryGraph from "./DiscoveryGraph";

interface SkillTreePanelProps {
  topic: string;
  files: SkillTreeFile[];
  tree: SkillTreeResult | null;
  status: GenerationStatus;
  discoveryNodes: DiscoveryNode[];
}

type ViewTab = "file" | "graph";

export default function SkillTreePanel({
  topic,
  files,
  tree,
  status,
  discoveryNodes,
}: SkillTreePanelProps) {
  const [selectedFile, setSelectedFile] = useState<string>("");
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
    if (!tree) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(tree.topic) || zip;
      for (const file of tree.files) {
        folder.file(file.path, file.content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${tree.topic}-skill-tree.zip`);
    } catch (error) {
      console.error("Failed to create ZIP:", error);
    } finally {
      setDownloading(false);
    }
  };

  // Auto-select first file when files arrive
  const effectiveSelected =
    selectedFile && files.find((f) => f.path === selectedFile)
      ? selectedFile
      : files.find((f) => f.path === "index.md")?.path ||
        files[0]?.path ||
        "";

  const currentFile = files.find((f) => f.path === effectiveSelected);

  if (files.length === 0) {
    if (status === "browsing" || status === "generating") {
      return (
        <div className="h-full min-h-[600px]">
          <DiscoveryGraph
            topic={topic}
            nodes={discoveryNodes}
            isGenerating={status === "generating"}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full border-4 border-black shadow-brutal bg-white">
        <div className="flex items-center gap-2 px-4 py-3 border-b-4 border-black bg-black text-white">
          <FileText size={14} />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Skill Tree
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Skill files will appear here
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* CLI Tree summary (only when complete) */}
      {tree && status === "complete" && (
        <div className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CLITree topic={tree.topic} files={tree.files} />
        </div>
      )}

      {/* Header Bar */}
      <div className="sticky top-0 z-10 mb-[-4px]">
        <div className="bg-black text-white p-4 flex items-center justify-between border-4 border-black shadow-brutal border-b-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-mono text-sm text-gray-400">
              <FileText size={16} />
              <span>{topic}</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-500">
              <span>{files.length} files</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

            {tree && (
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
            )}
          </div>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-[180px_1fr] border-4 border-black shadow-brutal bg-white flex-1 min-h-[600px]">
        <FileExplorer
          files={files}
          selectedFile={effectiveSelected}
          onSelectFile={handleSelectFile}
        />

        <div className="h-[600px] overflow-hidden">
          {viewTab === "file" && currentFile ? (
            <FileViewer
              file={currentFile}
              allFiles={files}
              onNavigate={handleSelectFile}
            />
          ) : viewTab === "graph" ? (
            <GraphView
              files={files}
              selectedFile={effectiveSelected}
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
  );
}
