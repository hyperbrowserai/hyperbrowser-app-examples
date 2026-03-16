"use client";

import { SkillTreeFile } from "@/types";
import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FolderClosed,
  FileText,
} from "lucide-react";

interface FileExplorerProps {
  files: SkillTreeFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

interface FolderNode {
  name: string;
  fullPath: string;
  children: FolderNode[];
  files: { name: string; path: string }[];
}

function buildFolderTree(files: SkillTreeFile[]): FolderNode {
  const root: FolderNode = { name: "", fullPath: "", children: [], files: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      let child = current.children.find((c) => c.name === folderName);
      if (!child) {
        child = {
          name: folderName,
          fullPath: parts.slice(0, i + 1).join("/"),
          children: [],
          files: [],
        };
        current.children.push(child);
      }
      current = child;
    }

    current.files.push({
      name: parts[parts.length - 1],
      path: file.path,
    });
  }

  return root;
}

function FolderItem({
  folder,
  selectedFile,
  onSelectFile,
  depth,
}: {
  folder: FolderNode;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-gray-100 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {expanded ? (
          <ChevronDown size={14} strokeWidth={2.5} className="shrink-0 text-gray-500" />
        ) : (
          <ChevronRight size={14} strokeWidth={2.5} className="shrink-0 text-gray-500" />
        )}
        {expanded ? (
          <FolderOpen size={14} strokeWidth={2.5} className="shrink-0" />
        ) : (
          <FolderClosed size={14} strokeWidth={2.5} className="shrink-0" />
        )}
        <span className="font-mono text-xs font-bold truncate">
          {folder.name}
        </span>
      </button>

      {expanded && (
        <div>
          {folder.children
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <FolderItem
                key={child.fullPath}
                folder={child}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                depth={depth + 1}
              />
            ))}
          {folder.files
            .sort((a, b) => {
              if (a.name === "index.md") return -1;
              if (b.name === "index.md") return 1;
              return a.name.localeCompare(b.name);
            })
            .map((file) => (
              <button
                key={file.path}
                onClick={() => onSelectFile(file.path)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors ${
                  selectedFile === file.path
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
                style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
              >
                <FileText
                  size={14}
                  strokeWidth={2}
                  className={`shrink-0 ${
                    selectedFile === file.path ? "text-white" : "text-gray-400"
                  }`}
                />
                <span className="font-mono text-xs truncate">{file.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
}: FileExplorerProps) {
  const tree = useMemo(() => buildFolderTree(files), [files]);

  const rootFiles = tree.files.sort((a, b) => {
    if (a.name === "index.md") return -1;
    if (b.name === "index.md") return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="h-full overflow-y-auto border-r-4 border-black bg-white">
      <div className="px-4 py-3 border-b-4 border-black bg-gray-50">
        <span className="font-bold text-xs uppercase tracking-wider">
          Files
        </span>
      </div>
      <div className="py-1">
        {rootFiles.map((file) => (
          <button
            key={file.path}
            onClick={() => onSelectFile(file.path)}
            className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors ${
              selectedFile === file.path
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
            style={{ paddingLeft: "8px" }}
          >
            <FileText
              size={14}
              strokeWidth={2}
              className={`shrink-0 ${
                selectedFile === file.path ? "text-white" : "text-gray-400"
              }`}
            />
            <span className="font-mono text-xs truncate">{file.name}</span>
          </button>
        ))}
        {tree.children
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((folder) => (
            <FolderItem
              key={folder.fullPath}
              folder={folder}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              depth={0}
            />
          ))}
      </div>
    </div>
  );
}
