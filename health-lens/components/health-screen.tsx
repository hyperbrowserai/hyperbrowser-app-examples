"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Sparkles, Loader2, Plus, FileText, FlaskConical, Heart, CheckCircle2, File } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StreamingText } from "@/components/streaming-text";
import { getCachedSearch, cacheSearch } from "@/lib/search-cache";
import { SearchResult } from "@/lib/hyperbrowser";
import { getActiveConversation, addMessage, addFile, buildContextForAI, getAllFiles, updateConversationTitle, type ChatMessage } from "@/lib/memory";
import { Sidebar } from "@/components/sidebar";
import { getCachedResearchForFile, getCachedResearchForFiles } from "@/lib/research-cache";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  fileAttachment?: {
    filename: string;
    fileType: string;
    fileSize: number;
    markers: Array<{
      name: string;
      value: string;
      unit?: string;
    }>;
  };
}

export default function HealthScreen() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | undefined>(undefined);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Array<{
    id: string;
    filename: string;
    fileType: string;
    fileSize: number;
    markers: Array<{ name: string; value: string; unit?: string }>;
    researchStatus?: "pending" | "completed" | "failed";
    isExtracting?: boolean;
  }>>([]);
  const [conversationKey, setConversationKey] = useState(0);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [isBackgroundResearch, setIsBackgroundResearch] = useState(false);
  const [processingStage, setProcessingStage] = useState<"extracting" | "researching" | "completed" | null>(null);
  const [prescrapedResearch, setPrescrapedResearch] = useState<SearchResult[]>([]);
  const [isPrescrapingDone, setIsPrescrapingDone] = useState(false);

  const isResearchBlocking = processingStage === "extracting" || processingStage === "researching";

  // Load messages from active conversation
  const loadActiveConversation = () => {
    const activeConv = getActiveConversation();
    if (activeConv && activeConv.messages.length > 0) {
      // Reconstruct messages with file attachments
      const loadedMessages: Message[] = activeConv.messages.map(m => {
        const baseMessage: Message = {
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        };

        // Check if this is a file upload message and reconstruct the attachment
        if (m.role === "user" && m.content.startsWith("Uploaded ")) {
          const filename = m.content.replace("Uploaded ", "");
          const file = activeConv.files.find(f => f.filename === filename);
          
          if (file) {
            baseMessage.fileAttachment = {
              filename: file.filename,
              fileType: file.fileType,
              fileSize: 0, // Not stored in FileMemory, but not critical
              markers: file.markers || [],
            };
          }
        }

        return baseMessage;
      });

      setMessages(loadedMessages);
    } else {
      setMessages([]);
    }
    setPendingFiles([]);
    setSearchResults(undefined);
  };

  // Load on mount - will be empty if no active conversation
  useEffect(() => {
    loadActiveConversation();
  }, []);

  // Pre-scrape trending health research on app load
  useEffect(() => {
    const prescrapeResearch = async () => {
      try {
        console.log("🔄 Pre-scraping health research...");
        const response = await fetch("/api/prescrape");
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            setPrescrapedResearch(data.results);
            console.log(`✅ Pre-scraped ${data.totalStudies} studies`);
          }
        }
      } catch (error) {
        console.error("Pre-scrape failed:", error);
      } finally {
        setIsPrescrapingDone(true);
      }
    };

    // Only pre-scrape if we don't have cached research
    if (!isPrescrapingDone && prescrapedResearch.length === 0) {
      prescrapeResearch();
    }
  }, []);

  const handleSubmit = async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || isLoading) return;
    if (isResearchBlocking) {
      setUploadStatus("Research is running. Chat unlocks when complete.");
      setTimeout(() => setUploadStatus(null), 2500);
      return;
    }

    setInput("");
    setUserHasScrolled(false); // Reset scroll flag on submit

    // Add pending file messages first (if any)
    const fileMessages: Message[] = pendingFiles.map(file => ({
      id: `file-${file.id}`,
      role: "user" as const,
      content: `Uploaded ${file.filename}`,
      timestamp: Date.now(),
      fileAttachment: file,
    }));

    // Add user text message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    // Combine file messages and user message
    const newMessages = [...fileMessages, userMessage];
    setMessages(prev => [...prev, ...newMessages]);

    // Clear pending files
    setPendingFiles([]);

    // Save file messages to memory
    fileMessages.forEach(msg => {
      addMessage({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      });
    });

    // Save user message to memory
    addMessage({
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      timestamp: userMessage.timestamp,
    });
    
    setIsLoading(true);
    setCurrentResponse("");
    setIsStreaming(false);

    try {
      let researchContext: SearchResult[] | null = null;

      // Step 1: Check for cached research from uploaded files
      const allFiles = getAllFiles();
      const fileIds = allFiles.map(f => f.id);
      const cachedFileResearch = getCachedResearchForFiles(fileIds);

      if (cachedFileResearch.length > 0) {
        // Use cached research from files
        console.log("Using cached research from uploaded files:", cachedFileResearch.length, "sources");
        researchContext = cachedFileResearch;
        setSearchResults(cachedFileResearch);
      } else {
        // Step 2: Fall back to classify + search flow
        const classifyResponse = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        });

        if (classifyResponse.ok) {
          const classification = await classifyResponse.json();
          
          if (classification.needsSearch && classification.searchTerms.length > 0) {
            // Step 3: Check search cache
            const cached = getCachedSearch(classification.searchTerms);
            
            if (cached) {
              researchContext = cached;
              setSearchResults(cached);
            } else {
              // Step 4: Perform deep search
              setIsSearching(true);
              setSearchResults(undefined);

              const searchResponse = await fetch("/api/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ terms: classification.searchTerms }),
              });

              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                researchContext = searchData.results;
                setSearchResults(searchData.results);
                
                // Cache the results
                cacheSearch(classification.searchTerms, searchData.results);
              }
              
              setIsSearching(false);
            }
          }
        }
      }

      // Step 4: Stream chat response with research context and memory
      setIsStreaming(true);
      
      const chatMessages = messages.concat(userMessage).map(m => ({
        role: m.role,
        parts: [{ type: "text", text: m.content }],
      }));

      // Build context from memory (files + recent conversation)
      const memoryContext = buildContextForAI();

      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: chatMessages,
          researchContext,
          memoryContext,
        }),
      });

      if (!chatResponse.ok) {
        throw new Error("Chat failed");
      }

      const reader = chatResponse.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          accumulatedText += chunk;
          setCurrentResponse(accumulatedText);
        }
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: accumulatedText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to memory
      addMessage({
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        timestamp: assistantMessage.timestamp,
        hasResearch: researchContext !== null && researchContext.length > 0,
      });

      // Generate smart title for new conversations (after first exchange)
      const activeConv = getActiveConversation();
      if (activeConv && activeConv.title === "New Chat" && activeConv.messages.length >= 2) {
        try {
          const titleResponse = await fetch("/api/generate-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userMessage: text,
              assistantResponse: accumulatedText,
            }),
          });
          
          if (titleResponse.ok) {
            const { title } = await titleResponse.json();
            if (title) {
              updateConversationTitle(activeConv.id, title);
              // Trigger sidebar update
              setConversationKey(prev => prev + 1);
            }
          }
        } catch (error) {
          console.error("Failed to generate title:", error);
        }
      }
      
      // Trigger sidebar refresh
      setConversationKey(prev => prev + 1);
      
      setCurrentResponse("");

    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Save error message to memory
      addMessage({
        id: errorMessage.id,
        role: errorMessage.role,
        content: errorMessage.content,
        timestamp: errorMessage.timestamp,
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      setIsStreaming(false);
      // Don't clear searchResults - keep them visible for reference in sidebar
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if files already exist in global profile
    const existingFiles = getAllFiles();
    const newFiles = Array.from(files).filter(file => {
      const isDuplicate = existingFiles.some(f => f.filename === file.name);
      if (isDuplicate) {
        setUploadStatus(`"${file.name}" already uploaded`);
        setTimeout(() => setUploadStatus(null), 3000);
      }
      return !isDuplicate;
    });

    if (newFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadStatus(newFiles.length === 1 ? "Uploading..." : `Uploading ${newFiles.length} files...`);
    setProcessingStage("extracting");
    console.log("🔬 Starting file extraction and research...");

    for (const file of newFiles) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/files", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();

          // Convert file to base64 for storage
          const reader = new FileReader();
          const fileId = data.file.id || Date.now().toString() + Math.random().toString(36).substr(2, 9);
          
          reader.onloadend = () => {
            const base64data = reader.result as string;
            
            // Save file to memory with full content
            addFile({
              id: fileId,
              filename: data.file.filename,
              fileType: data.file.fileType,
              uploadedAt: Date.now(),
              rawText: data.file.rawText || "", // Include full text content
              fileData: base64data, // Store base64 encoded file
              markers: data.file.markers || [],
              summary: data.file.markers && data.file.markers.length > 0
                ? `Extracted ${data.file.markers.length} health markers`
                : undefined,
              researchStatus: data.file.researchStatus,
            });
          };
          reader.readAsDataURL(file);

          // Cache research results client-side if included in response
          if (data.research && data.research.status === "completed") {
            import("@/lib/research-cache").then(({ cacheResearchForFile }) => {
              cacheResearchForFile(fileId, data.research.queries, data.research.results);
              console.log("✅ Research cached for file:", fileId);
            });
          }

          // Add to pending files
          setPendingFiles(prev => [...prev, {
            id: fileId,
            filename: data.file.filename,
            fileType: data.file.fileType,
            fileSize: data.file.fileSize || 0,
            markers: data.file.markers || [],
            researchStatus: data.file.researchStatus,
            isExtracting: false,
          }]);
          
          // Research is now completed immediately in the API
          if (data.file.researchStatus === "completed") {
            console.log("✅ File uploaded and research completed");
            setProcessingStage("completed");
            // Update search results immediately
            if (data.research?.results) {
              setSearchResults(data.research.results);
            }
            // Auto-clear after 2 seconds
            setTimeout(() => {
              setProcessingStage(null);
            }, 2000);
          } else if (data.file.researchStatus === "failed") {
            console.log("⚠️ Research failed for file");
            setProcessingStage(null);
          }

        } else {
          console.error(`Upload failed for ${file.name}`);
        }
      } catch (err) {
        console.error(`Upload failed for ${file.name}`, err);
      }
    }

    setUploadStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Detect user scroll
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      setUserHasScrolled(!isAtBottom);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll only when appropriate
  useEffect(() => {
    if (scrollRef.current && !userHasScrolled) {
      const scrollContainer = scrollRef.current;
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      
      // Only auto-scroll if user hasn't manually scrolled up and is near bottom
      if (isNearBottom) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, currentResponse, isSearching, userHasScrolled]);

  // Clean up pending files when no longer needed
  useEffect(() => {
    // Auto-clear pending files after they're acknowledged
    if (pendingFiles.length === 0 && processingStage !== "extracting") {
      setIsBackgroundResearch(false);
    }
  }, [pendingFiles, processingStage]);

  // Calculate all research results to display in sidebar
  const allResearchResults = useMemo(() => {
    const results: SearchResult[] = [];
    const seenKeys = new Set<string>();

    const addResults = (items: SearchResult[]) => {
      items.forEach(r => {
        // Use source + first study title as unique key
        const key = `${r.source}-${r.studies[0]?.title || r.searchTerms.join(',')}`;
        if (!seenKeys.has(key)) {
          results.push(r);
          seenKeys.add(key);
        }
      });
    };

    // 1. Active search results (highest priority)
    if (searchResults) addResults(searchResults);

    // 2. Pending files research
    if (pendingFiles.length > 0) {
      const pendingIds = pendingFiles.map(f => f.id);
      const pendingResearch = getCachedResearchForFiles(pendingIds);
      addResults(pendingResearch);
    }

    // 3. Active conversation files research
    const activeConv = getActiveConversation();
    if (activeConv && activeConv.files && activeConv.files.length > 0) {
      const fileIds = activeConv.files.map(f => f.id);
      const fileResearch = getCachedResearchForFiles(fileIds);
      addResults(fileResearch);
    }

    // 4. Pre-scraped research (shown when no other results)
    if (results.length === 0 && prescrapedResearch.length > 0) {
      addResults(prescrapedResearch);
    }

    return results;
  }, [searchResults, pendingFiles, messages, conversationKey, prescrapedResearch]);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar 
        key={conversationKey} 
        onConversationChange={loadActiveConversation}
        searchResults={allResearchResults}
        processingStage={processingStage}
        isPrescraping={!isPrescrapingDone && prescrapedResearch.length === 0}
      />
      <div className="flex-1 flex flex-col h-screen bg-white relative">
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-8 scrollbar-thin">
            <div className="mx-auto max-w-3xl min-h-full flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center pt-8">
                  {/* Floating Heart */}
                  <motion.div
                    initial={{ y: 0, scale: 0.9 }}
                    animate={{ y: -10, scale: 1 }}
                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 3, ease: "easeInOut" }}
                    className="mb-8 relative"
                  >
                    <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 rounded-full scale-150" />
                    <div className="h-20 w-20 rounded-2xl bg-white shadow-xl flex items-center justify-center relative z-10">
                      <Heart className="h-10 w-10 text-red-500 fill-red-500" />
                    </div>
                  </motion.div>

                  <h1 className="text-4xl font-semibold text-neutral-900 mb-4 tracking-tight text-center text-balance">
                    How are you feeling?
                  </h1>
                  <p className="text-neutral-500 text-lg mb-2 text-center max-w-md text-balance">
                    I can help analyze your health data, explain lab results, or just chat about your wellness.
                  </p>
                  <p className="text-neutral-400 text-xs mb-12 text-center">
                    Powered by <a href="https://hyperbrowser.ai" target="_blank" rel="noopener noreferrer" className="text-neutral-900 font-semibold hover:underline">Hyperbrowser</a>
                  </p>

                  {/* Pending Files Preview */}
                  {pendingFiles.length > 0 && (
                    <div className="w-full max-w-xl mb-8 space-y-2">
                      {pendingFiles.map((file) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative rounded-2xl bg-gradient-to-br from-white to-neutral-50 border-2 border-neutral-200 p-5 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
                        >
                          {/* Subtle background pattern */}
                          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                          </div>
                          
                          {/* File info */}
                          <div className="relative flex items-start gap-4">
                            <div className="relative h-14 w-14 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300 border border-neutral-800">
                              <File className="h-6 w-6 text-white" />
                              <span className="absolute bottom-1 text-[9px] font-bold text-white tracking-tight font-mono">PDF</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono uppercase tracking-wider">
                                  {file.fileType === "application/pdf" ? "PDF" : "DOC"}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-mono">|</span>
                                <span className="text-[10px] text-neutral-400 font-medium font-mono">
                                  {(file.fileSize / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-neutral-900 truncate mb-1 font-mono">
                                {file.filename}
                              </p>
                              <p className="text-xs text-neutral-500 flex items-center gap-1 font-mono">
                                <span className="text-neutral-900 font-bold">{`>`}</span>
                                Ready to analyze
                              </p>
                            </div>
                            <button
                              onClick={() => setPendingFiles(prev => prev.filter(f => f.id !== file.id))}
                              className="h-8 w-8 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors flex-shrink-0"
                            >
                              <span className="text-neutral-500 text-xl">×</span>
                            </button>
                          </div>

                          {/* Extracted markers */}
                          {file.markers && file.markers.length > 0 && (
                            <div className="relative border-t border-dashed border-neutral-200 pt-4 mt-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded bg-neutral-100 flex items-center justify-center border border-neutral-200">
                                    <FlaskConical className="h-3.5 w-3.5 text-neutral-700" />
                                  </div>
                                  <span className="text-xs font-semibold text-neutral-700 font-mono">
                                    {file.markers.length} MARKERS EXTRACTED
                                  </span>
                                </div>
                                {file.markers.length > 4 && (
                                  <span className="text-[10px] text-neutral-400 font-medium font-mono">
                                    [Top 4]
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2.5">
                                {file.markers.slice(0, 4).map((marker, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs p-2.5 rounded border border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 transition-colors font-mono"
                                  >
                                    <span className="text-neutral-600 truncate mr-2">{marker.name}</span>
                                    <div className="flex items-baseline gap-1 flex-shrink-0">
                                      <span className="font-bold text-neutral-900">
                                        {marker.value}
                                      </span>
                                      {marker.unit && (
                                        <span className="text-[10px] text-neutral-400">{marker.unit}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {file.markers.length > 4 && (
                                  <div className="flex items-center justify-center text-xs p-2 rounded border border-dashed border-neutral-200 text-neutral-400 font-mono">
                                    +{file.markers.length - 4} more...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Search Bar Area */}
                  <div className="w-full max-w-xl relative group z-20">
                    <div className="absolute -inset-1 bg-gradient-to-r from-neutral-100 to-neutral-200 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-500" />
                    <div className="relative flex items-center p-2 pl-4 bg-white border border-neutral-200 rounded-[2rem] shadow-sm transition-all duration-300 hover:shadow-md hover:border-neutral-300 focus-within:shadow-lg focus-within:border-neutral-400">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-neutral-50 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-all mr-2 flex-shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload PDF files"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
                        onChange={handleFileUpload}
                      />
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSubmit();
                        }}
                        placeholder={isResearchBlocking ? "Research in progress..." : "Ask anything about your health..."}
                        disabled={isResearchBlocking}
                        className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-neutral-400 text-neutral-900 h-12 disabled:text-neutral-400 disabled:cursor-not-allowed"
                      />
                      <div className="pr-2">
                        {input.trim() ? (
                          <Button
                            size="icon"
                            onClick={() => handleSubmit()}
                            disabled={isResearchBlocking}
                            className="h-10 w-10 rounded-full bg-neutral-900 text-white hover:bg-black transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <div className="h-10 w-10" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upload Status */}
                  <AnimatePresence>
                    {uploadStatus && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-neutral-900 text-white text-sm font-medium shadow-lg flex items-center gap-2"
                      >
                        {uploadStatus.includes("Uploading") && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                        )}
                        <span>{uploadStatus}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Get Started Cards */}
                  <div className="mt-16 w-full max-w-4xl overflow-x-auto pb-4 scrollbar-hide">
                    <div className="flex gap-4 justify-center min-w-max px-4">
                      <button className="flex flex-col items-start text-left p-6 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 w-72 group">
                        <div className="h-12 w-12 rounded-xl bg-neutral-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-neutral-100">
                          <FileText className="h-6 w-6 text-neutral-700" />
                        </div>
                        <h3 className="font-semibold text-neutral-900 mb-2 text-lg">Analyze Records</h3>
                        <p className="text-sm text-neutral-500 leading-relaxed">
                          Upload clinical notes or history to get a clear summary and actionable insights.
                        </p>
                      </button>

                      <button className="flex flex-col items-start text-left p-6 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 w-72 group">
                        <div className="h-12 w-12 rounded-xl bg-neutral-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-neutral-100">
                          <FlaskConical className="h-6 w-6 text-neutral-700" />
                        </div>
                        <h3 className="font-semibold text-neutral-900 mb-2 text-lg">Lab Results</h3>
                        <p className="text-sm text-neutral-500 leading-relaxed">
                          Understand your blood work and get questions to ask your doctor.
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-10 pb-40">
                  <AnimatePresence initial={false}>
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                      >
                        {message.role === "user" ? (
                          <div className="max-w-[85%]">
                            {message.fileAttachment ? (
                              // File attachment message
                              <div className="relative rounded-xl bg-white border border-neutral-200 p-5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                                {/* Subtle background pattern */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                                </div>
                                
                                {/* File info */}
                                <div className="relative flex items-start gap-4">
                                  <div className="relative h-14 w-14 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300 border border-neutral-800">
                                    <File className="h-6 w-6 text-white" />
                                    <span className="absolute bottom-1 text-[9px] font-bold text-white tracking-tight font-mono">PDF</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono uppercase tracking-wider">
                                  {message.fileAttachment.fileType === "application/pdf" ? "PDF" : "DOC"}
                                </span>
                                      <span className="text-[10px] text-neutral-400 font-mono">|</span>
                                      <span className="text-[10px] text-neutral-400 font-medium font-mono">
                                        {(message.fileAttachment.fileSize / 1024).toFixed(1)} KB
                                      </span>
                                    </div>
                                    <p className="text-sm font-semibold text-neutral-900 truncate mb-1 font-mono">
                                      {message.fileAttachment.filename}
                                    </p>
                                    <p className="text-xs text-neutral-500 flex items-center gap-1 font-mono">
                                      <span className="text-neutral-900 font-bold">{`>`}</span>
                                      Successfully uploaded and analyzed
                                    </p>
                                  </div>
                                </div>

                                {/* Extracted markers */}
                                {message.fileAttachment.markers && message.fileAttachment.markers.length > 0 && (
                                  <div className="relative border-t border-dashed border-neutral-200 pt-4 mt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded bg-neutral-100 flex items-center justify-center border border-neutral-200">
                                          <FlaskConical className="h-3.5 w-3.5 text-neutral-700" />
                                        </div>
                                        <span className="text-xs font-semibold text-neutral-700 font-mono">
                                          {message.fileAttachment.markers.length} MARKERS EXTRACTED
                                        </span>
                                      </div>
                                      {message.fileAttachment.markers.length > 4 && (
                                        <span className="text-[10px] text-neutral-400 font-medium font-mono">
                                          [Top 4]
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      {message.fileAttachment.markers.slice(0, 4).map((marker, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between text-xs p-2.5 rounded border border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 transition-colors font-mono"
                                        >
                                          <span className="text-neutral-600 truncate mr-2">{marker.name}</span>
                                          <div className="flex items-baseline gap-1 flex-shrink-0">
                                            <span className="font-bold text-neutral-900">
                                              {marker.value}
                                            </span>
                                            {marker.unit && (
                                              <span className="text-[10px] text-neutral-400">{marker.unit}</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Regular text message
                              <div className="rounded-2xl bg-neutral-900 px-5 py-3.5 text-white">
                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                                  {message.content}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-4 max-w-3xl w-full">
                            <div className="h-8 w-8 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                              <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="prose prose-neutral max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-strong:font-semibold prose-ul:list-disc prose-ul:pl-4">
                                <StreamingText text={message.content} isStreaming={false} />
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Thinking Indicator */}
                  {isLoading && !isSearching && !isStreaming && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex gap-4 max-w-3xl w-full"
                    >
                      <div className="h-8 w-8 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex items-center gap-3 h-8">
                        <div className="flex gap-1.5">
                          <motion.div
                            className="w-1.5 h-1.5 bg-neutral-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div
                            className="w-1.5 h-1.5 bg-neutral-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div
                            className="w-1.5 h-1.5 bg-neutral-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                        <span className="text-sm font-medium text-neutral-400">Thinking...</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Deep Search Animation */}
                  {/* Streaming Response */}
                  {isStreaming && currentResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4 max-w-3xl w-full"
                    >
                      <div className="h-8 w-8 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="prose prose-neutral max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-strong:font-semibold prose-ul:list-disc prose-ul:pl-4">
                          <StreamingText text={currentResponse} isStreaming={true} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Floating Input Area (only visible when chat has started) */}
          {messages.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-20">
              <div className="mx-auto max-w-3xl">
                {/* Pending Files Preview */}
                {pendingFiles.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {pendingFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative rounded-lg bg-white border border-neutral-200 p-3 shadow-sm overflow-hidden group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded bg-neutral-900 flex items-center justify-center flex-shrink-0 shadow-sm border border-neutral-800">
                            <File className="h-5 w-5 text-white" />
                            <span className="absolute bottom-0.5 text-[7px] font-bold text-white tracking-tight font-mono">PDF</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-neutral-900 truncate font-mono">
                              {file.filename}
                            </p>
                            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                              {(file.fileSize / 1024).toFixed(1)} KB • Ready
                            </p>
                          </div>
                          <button
                            onClick={() => setPendingFiles(prev => prev.filter(f => f.id !== file.id))}
                            className="h-7 w-7 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors flex-shrink-0"
                          >
                            <span className="text-neutral-400 text-lg">×</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                <div className="relative bg-white rounded-[1.5rem] shadow-xl border border-neutral-200 p-2 flex items-end gap-2 ring-1 ring-neutral-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isLoading || isResearchBlocking}
                    className="h-10 w-10 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 mb-1 ml-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload PDF files"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
                    onChange={handleFileUpload}
                  />
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={isResearchBlocking ? "Research in progress..." : "Ask follow-up..."}
                    disabled={isResearchBlocking}
                    className="flex-1 min-h-[48px] max-h-32 bg-transparent border-none shadow-none focus-visible:ring-0 resize-none py-3 text-base placeholder:text-neutral-400 disabled:text-neutral-400 disabled:cursor-not-allowed"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSubmit()}
                    disabled={isLoading || !input.trim() || isResearchBlocking}
                    className={`h-10 w-10 rounded-full mb-1 mr-1 flex-shrink-0 transition-all duration-200 ${
                      input.trim() && !isResearchBlocking
                        ? "bg-neutral-900 text-white hover:bg-black shadow-md hover:shadow-lg hover:-translate-y-0.5" 
                        : "bg-neutral-100 text-neutral-300"
                    }`}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-center mt-3">
                  <p className="text-[10px] text-neutral-400 font-medium">
                    HealthLens can make mistakes. Verify important information.
                  </p>
                </div>

                {/* Upload Status for Mid-Chat Uploads */}
                <AnimatePresence>
                  {uploadStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute -top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-neutral-900 text-white text-sm font-medium shadow-lg flex items-center gap-2"
                    >
                      {uploadStatus.includes("Uploading") && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                      )}
                      <span>{uploadStatus}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
