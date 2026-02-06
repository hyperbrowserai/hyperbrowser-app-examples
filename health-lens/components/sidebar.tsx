"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Plus, Trash2, PanelLeftClose, PanelLeft, FileText, Pencil, AlertTriangle, X, ChevronRight, ExternalLink, Download, Loader2, CheckCircle2, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllConversations,
  getActiveConversation,
  setActiveConversation,
  deleteConversation,
  startNewConversation,
  getGlobalProfile,
  updateConversationTitle,
  deleteFile,
  type Conversation,
  type HealthProfile,
  type FileMemory,
} from "@/lib/memory";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SidebarProps {
  onConversationChange?: () => void;
  searchResults?: Array<{
    source: string;
    studies: Array<{ title: string; url?: string; pmid?: string; year?: string }>;
  }>;
  processingStage?: "extracting" | "researching" | "completed" | null;
  isPrescraping?: boolean;
}

export function Sidebar({ onConversationChange, searchResults, processingStage, isPrescraping }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [globalProfile, setGlobalProfile] = useState<HealthProfile | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileMemory | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = () => {
    const convs = getAllConversations();
    setConversations(convs);
    const active = getActiveConversation();
    setActiveId(active?.id || null);
    const profile = getGlobalProfile();
    setGlobalProfile(profile);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleNewChat = () => {
    startNewConversation();
    loadConversations();
    onConversationChange?.();
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    setActiveId(id);
    onConversationChange?.();
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (conversationToDelete) {
      deleteConversation(conversationToDelete);
      loadConversations();
      onConversationChange?.();
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const handleViewFile = (file: FileMemory) => {
    setSelectedFile(file);
    setShowFileDetails(true);
  };

  const handleDeleteFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setFileToDelete(fileId);
  };

  const confirmFileDelete = () => {
    if (fileToDelete) {
      deleteFile(fileToDelete);
      loadConversations();
    }
    setFileToDelete(null);
  };

  const cancelFileDelete = () => {
    setFileToDelete(null);
  };

  const handleOpenFile = (file: FileMemory) => {
    if (file.fileData) {
      // Open PDF in new tab
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${file.filename}</title>
              <style>
                body { margin: 0; padding: 0; overflow: hidden; }
                iframe { border: none; width: 100vw; height: 100vh; }
              </style>
            </head>
            <body>
              <iframe src="${file.fileData}"></iframe>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    }
  };

  const handleDownloadFile = (file: FileMemory) => {
    if (file.fileData) {
      const link = document.createElement('a');
      link.href = file.fileData;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      updateConversationTitle(editingId, editingTitle.trim());
      loadConversations();
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const processingDetail =
    processingStage === "extracting"
      ? {
          title: "Extracting data",
          detail: "Reading your file and extracting markers.",
        }
      : processingStage === "researching"
        ? {
            title: "Researching evidence",
            detail: "Searching PubMed for relevant studies.",
          }
        : processingStage === "completed"
          ? {
              title: "Research ready",
              detail: "References will be used in the response.",
            }
          : null;

  if (isCollapsed) {
    return (
      <div className="w-16 h-screen bg-neutral-50 border-r border-neutral-200 flex flex-col items-center py-4 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="w-10 h-10"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChat}
          className="w-10 h-10"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 h-screen bg-neutral-50/50 border-r border-neutral-200 flex flex-col backdrop-blur-sm transition-all duration-300">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 flex items-center justify-center">
            <img 
              src="/hyperbrowser_symbol-DARK.svg" 
              alt="Hyperbrowser" 
              className="h-full w-full object-contain"
            />
          </div>
          <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">HealthLens</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="h-8 w-8 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-4">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2.5 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 shadow-sm hover:shadow transition-all duration-200 h-10 rounded-xl font-medium"
          variant="outline"
        >
          <Plus className="h-4 w-4 text-neutral-500" />
          New Chat
        </Button>
      </div>

      {/* Global Health Data */}
      {globalProfile && globalProfile.files.length > 0 && (
        <div className="px-3 pb-4 border-b border-neutral-100 mb-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Files
            </div>
            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full font-medium">
              {globalProfile.files.length}
            </span>
          </div>
          <div className="space-y-1">
            {globalProfile.files.slice(-3).reverse().map((file) => (
              <div
                key={file.id}
                className="group relative"
              >
                <button
                  onClick={() => handleViewFile(file)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-neutral-100 transition-all duration-200 group/item"
                >
                  <div className="h-7 w-7 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0 group-hover/item:bg-neutral-50 transition-colors">
                    <FileText className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate text-neutral-700 font-medium text-xs group-hover/item:text-neutral-900 transition-colors">{file.filename}</p>
                    {file.markers && file.markers.length > 0 && (
                      <p className="text-neutral-400 text-[10px]">
                        {file.markers.length} markers
                      </p>
                    )}
                  </div>
                </button>
                <button
                  onClick={(e) => handleDeleteFile(e, file.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 transition-all z-10"
                >
                  <X className="h-3 w-3 text-neutral-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversations List (History) - Now at top */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-thin">
        <div className="px-2 mb-2 mt-2">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            History
          </div>
        </div>
        <AnimatePresence>
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4 opacity-50">
              <MessageSquare className="h-8 w-8 text-neutral-300 mb-2" />
              <p className="text-xs text-neutral-500">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => editingId !== conv.id && handleSelectConversation(conv.id)}
                className={`w-full text-left p-2 rounded-lg mb-1 group transition-all duration-200 cursor-pointer relative ${
                  activeId === conv.id
                    ? "bg-white border border-neutral-200 shadow-sm z-10"
                    : "hover:bg-neutral-100 border border-transparent"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === conv.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm font-medium text-neutral-900 bg-white border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-100 transition-all"
                        autoFocus
                      />
                    ) : (
                      <p className={`text-sm font-medium truncate mb-0.5 transition-colors ${
                        activeId === conv.id ? "text-neutral-900" : "text-neutral-600 group-hover:text-neutral-900"
                      }`}>
                        {conv.title}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                      <span>{formatDate(conv.updatedAt)}</span>
                      {conv.messages.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{conv.messages.length} msgs</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => handleStartEdit(e, conv)}
                      className="p-1.5 rounded hover:bg-neutral-200 transition-colors"
                    >
                      <Pencil className="h-3 w-3 text-neutral-400 hover:text-neutral-600" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Research Sources Section - Now at bottom */}
      {(searchResults && searchResults.length > 0) || processingStage || isPrescraping ? (
        <div className="px-3 py-4 border-t border-neutral-100 mt-auto">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Research
            </div>
            {searchResults && searchResults.length > 0 && (
              <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full font-medium">
                {searchResults.reduce((acc, r) => acc + r.studies.length, 0)} studies
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {/* Pre-scraping loading state */}
            {isPrescraping && (
              <div className="p-3 rounded-lg bg-white border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-semibold text-neutral-900 font-mono uppercase tracking-tight">
                    Loading Research
                  </span>
                  <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
                </div>
                <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-neutral-900 rounded-full"
                    animate={{ width: ["0%", "70%", "30%", "90%", "50%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
                <div className="mt-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[10px] text-neutral-600">
                  <div className="text-neutral-900 font-semibold">
                    Fetching from PubMed
                  </div>
                  <div className="text-neutral-500">
                    Pre-loading latest medical research...
                  </div>
                </div>
              </div>
            )}
            {/* File processing state */}
            {processingStage && (
              <div className="p-3 rounded-lg bg-white border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-semibold text-neutral-900 font-mono uppercase tracking-tight">
                    {processingStage === "extracting" ? "Extracting Data" : 
                     processingStage === "researching" ? "Searching PubMed" : 
                     "Research Complete"}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {processingStage === "extracting" ? "30%" : 
                     processingStage === "researching" ? "60%" : 
                     "100%"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-neutral-900 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ 
                      width: processingStage === "extracting" ? "30%" : 
                             processingStage === "researching" ? "60%" : 
                             "100%" 
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
                {processingDetail && (
                  <div className="mt-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[10px] text-neutral-600">
                    <div className="text-neutral-900 font-semibold">
                      {processingDetail.title}
                    </div>
                    <div className="text-neutral-500">
                      {processingDetail.detail}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Research results */}
            {searchResults && searchResults.map((result, resultIdx) => (
              <div
                key={`${result.source}-${resultIdx}`}
                className="p-3 rounded-lg bg-white border border-neutral-200 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded bg-neutral-900 flex items-center justify-center">
                    <Globe className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-900 font-mono">{result.source}</span>
                </div>
                {result.studies && result.studies.length > 0 && (
                  <div className="space-y-2">
                    {result.studies.slice(0, 3).map((study, idx) => (
                      <a
                        key={idx}
                        href={study.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 rounded border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 transition-all group"
                      >
                        <p className="text-[11px] text-neutral-700 font-medium line-clamp-2 group-hover:text-neutral-900">
                          {study.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {study.pmid && (
                            <span className="text-[9px] text-neutral-400 font-mono">
                              PMID: {study.pmid}
                            </span>
                          )}
                          {study.year && (
                            <span className="text-[9px] text-neutral-400 font-mono">
                              {study.year}
                            </span>
                          )}
                          <ExternalLink className="h-2.5 w-2.5 text-neutral-400 ml-auto" />
                        </div>
                      </a>
                    ))}
                    {result.studies.length > 3 && (
                      <p className="text-[10px] text-neutral-400 text-center py-1">
                        +{result.studies.length - 3} more studies
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Delete Conversation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-neutral-200">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg font-semibold text-neutral-900">
                Delete Conversation
              </DialogTitle>
            </div>
            <DialogDescription className="text-neutral-600 text-sm">
              This will permanently delete this conversation. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cancelDelete}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Details Dialog */}
      <Dialog open={showFileDetails} onOpenChange={setShowFileDetails}>
        <DialogContent className="sm:max-w-2xl bg-white border-neutral-200 max-h-[80vh] overflow-y-auto">
          {selectedFile && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0 border border-neutral-800 shadow-sm">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg font-semibold text-neutral-900 break-words font-mono tracking-tight">
                      {selectedFile.filename}
                    </DialogTitle>
                    <DialogDescription className="text-neutral-500 text-xs font-mono mt-1">
                      UPLOADED {new Date(selectedFile.uploadedAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).toUpperCase()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {selectedFile.markers && selectedFile.markers.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider font-mono flex items-center gap-2">
                      <div className="h-px flex-1 bg-neutral-200"></div>
                      Health Markers ({selectedFile.markers.length})
                      <div className="h-px flex-1 bg-neutral-200"></div>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                      {selectedFile.markers.map((marker, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded border border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 transition-colors"
                        >
                          <span className="text-xs text-neutral-600 font-medium font-mono truncate mr-2">{marker.name}</span>
                          <div className="flex items-baseline gap-1 flex-shrink-0">
                            <span className="font-bold text-sm tabular-nums text-neutral-900 font-mono">
                              {marker.value}
                            </span>
                            {marker.unit && (
                              <span className="text-[10px] text-neutral-400 font-mono">{marker.unit}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFile.rawText && (
                  <div>
                    <h3 className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider font-mono flex items-center gap-2">
                      <div className="h-px flex-1 bg-neutral-200"></div>
                      File Content Preview
                      <div className="h-px flex-1 bg-neutral-200"></div>
                    </h3>
                    <div className="p-4 rounded-lg bg-white border border-neutral-200 max-h-60 overflow-y-auto shadow-sm">
                      <p className="text-xs text-neutral-600 whitespace-pre-wrap font-mono leading-relaxed">
                        {selectedFile.rawText.substring(0, 1000)}
                        {selectedFile.rawText.length > 1000 && '...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-6 flex-col sm:flex-row border-t border-neutral-100 pt-4">
                <div className="flex gap-2 flex-1">
                  {selectedFile.fileData && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleOpenFile(selectedFile)}
                        className="border-neutral-200 text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-mono text-xs h-9"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        OPEN PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadFile(selectedFile)}
                        className="border-neutral-200 text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-mono text-xs h-9"
                      >
                        <Download className="h-3.5 w-3.5" />
                        DOWNLOAD
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowFileDetails(false)}
                    className="border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-mono text-xs h-9"
                  >
                    CLOSE
                  </Button>
                  <Button
                    onClick={() => {
                      handleDeleteFile({ stopPropagation: () => {} } as React.MouseEvent, selectedFile.id);
                      setShowFileDetails(false);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs h-9 shadow-sm"
                  >
                    DELETE
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete File Dialog */}
      <Dialog open={fileToDelete !== null} onOpenChange={() => setFileToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-white border-neutral-200">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg font-semibold text-neutral-900">
                Delete File
              </DialogTitle>
            </div>
            <DialogDescription className="text-neutral-600 text-sm">
              This will permanently delete this file and all its extracted data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cancelFileDelete}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmFileDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
