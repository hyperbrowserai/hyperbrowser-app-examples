"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, Share2, MoreHorizontal, Image as ImageIcon, Upload, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Button from "@/components/button";
import ShareModal from "@/components/share-modal";
import StreamingText from "@/components/streaming-text";
import Navbar from "@/components/navbar";
import TextSelectionToolbar from "@/components/text-selection-toolbar";
import ChatPanel from "@/components/chat-panel";
import { savePage as savePageToStorage, generateSlug, getPageBySlug, type Page } from "@/lib/storage";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

interface Section {
  id: string;
  title: string;
  content: string;
  image?: string;
  isStreaming?: boolean;
}

function EditorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic") || "";
  const audience = searchParams.get("audience") || "Anyone";

  const [isWriting, setIsWriting] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [currentSectionForMedia, setCurrentSectionForMedia] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sources, setSources] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [heroImage, setHeroImage] = useState<string>("");
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (sections.length > 0 || !topic) return;
    
    const loadOrGeneratePage = async () => {
      // Check if page already exists in localStorage
      const pageSlug = generateSlug(topic);
      const existingPage = getPageBySlug(pageSlug);
      
      if (existingPage) {
        // Load existing page from localStorage
        console.log('Loading existing page from localStorage');
        setPageTitle(existingPage.title);
        setSlug(existingPage.slug);
        setHeroImage(existingPage.hero_image || '');
        
        // Load sections without streaming (already saved)
        setSections(existingPage.sections.map(s => ({
          ...s,
          isStreaming: false,
        })));
        
        if (existingPage.sections.length > 0) {
          setActiveSection(existingPage.sections[0].id);
        }
        
        return;
      }
      
      // Generate new page if it doesn't exist
      console.log('Generating new page');
      setIsWriting(true);
      setIsLoadingImages(true);
      setPageTitle(topic);
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, audience }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Generation failed');
        }

        const data = await response.json();
        
        // STEP 1: Show hero image immediately (feels instant)
        if (data.heroImage) {
          setHeroImage(data.heroImage);
        }
        
        // STEP 2: Show section titles immediately (before content)
        if (data.outlines && data.outlines.length > 0) {
          setSections(data.outlines.map((outline: any) => ({
            ...outline,
            isStreaming: false,
            content: '',
          })));
        }
        
        // STEP 3: Stream full sections with content and images
        for (let i = 0; i < data.sections.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 200));
          const section = data.sections[i];
          
          setSections(prev => prev.map((s, idx) => 
            idx === i 
              ? { 
                  ...section, 
                  isStreaming: true,
                  image: section.image || s.image, // Use fetched image if available
                }
              : s
          ));
          setActiveSection(section.id);
        }

        setIsLoadingImages(false);
        
        // Save to localStorage
        savePage(data.sections);
      } catch (error) {
        console.error('Generation error:', error);
        setIsLoadingImages(false);
      } finally {
        setIsWriting(false);
      }
    };

    loadOrGeneratePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  // Fetch sources after content generation starts
  useEffect(() => {
    if (topic && sources.length === 0) {
      let isMounted = true;
      
      const fetchSourcesData = async () => {
        setLoadingSources(true);
        try {
          const response = await fetch(`/api/sources?topic=${encodeURIComponent(topic)}`);
          const data = await response.json();
          if (isMounted) {
            setSources(data.sources || []);
          }
        } catch (error) {
          console.error('Error fetching sources:', error);
        } finally {
          if (isMounted) {
            setLoadingSources(false);
          }
        }
      };
      
      // Fetch sources after a short delay
      const timer = setTimeout(fetchSourcesData, 1000);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [topic]);

  // Track scroll position for active section indicator
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(s => document.getElementById(s.id)).filter(Boolean);
      
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const element = sectionElements[i];
        if (element) {
          const rect = element.getBoundingClientRect();
          // Check if section is in viewport (top half of screen)
          if (rect.top <= window.innerHeight / 3) {
            setActiveSection(sections[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  // Auto-save when sections change
  useEffect(() => {
    if (sections.length > 0 && !isWriting && slug) {
      const timeoutId = setTimeout(() => {
        // Get the actual HTML content from the DOM to preserve formatting
        const updatedSections = sections.map(section => {
          const sectionElement = document.getElementById(section.id);
          const contentDiv = sectionElement?.querySelector('.text-xl');
          const titleElement = sectionElement?.querySelector('h2');
          
          let updatedSection = { ...section };
          
          // Save title changes
          if (titleElement?.textContent) {
            updatedSection.title = titleElement.textContent.trim();
          }
          
          // Save content with formatting
          if (contentDiv) {
            updatedSection.content = contentDiv.innerHTML || section.content;
          }
          
          return updatedSection;
        });
        
        savePage(updatedSections);
      }, 2000); // Debounce saves

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, isWriting, slug]);

  const savePage = (sectionsToSave: Section[]) => {
    try {
      const pageSlug = slug || generateSlug(topic);
      
      // Check if page already exists
      const existingPage = getPageBySlug(pageSlug);
      const pageId = existingPage?.id || `page-${Date.now()}`;
      
      const page: Page = {
        id: pageId,
        slug: pageSlug,
        title: topic,
        topic,
        audience,
        sections: sectionsToSave.map(s => ({
          id: s.id,
          title: s.title,
          content: s.content,
          image: s.image,
        })),
        created_at: existingPage?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      savePageToStorage(page);
      setSlug(pageSlug);
      
      // Trigger sidebar refresh
      window.dispatchEvent(new Event('pagesUpdated'));
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleStreamComplete = (sectionId: string) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, isStreaming: false }
          : section
      )
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    if (sections.length <= 1) {
      alert('Cannot delete the last section');
      return;
    }
    
    if (confirm('Are you sure you want to delete this section?')) {
      setSections(prev => prev.filter(s => s.id !== sectionId));
    }
  };

  const handleInsertSection = (afterSectionId: string) => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: "New Section",
      content: "Start writing your content here...",
      isStreaming: false,
    };

    setSections(prev => {
      const index = prev.findIndex(s => s.id === afterSectionId);
      const newSections = [...prev];
      newSections.splice(index + 1, 0, newSection);
      return newSections;
    });

    setTimeout(() => {
      document.getElementById(newSection.id)?.scrollIntoView({ behavior: "smooth" });
      setActiveSection(newSection.id);
    }, 100);
  };

  const handleAddMedia = (sectionId: string) => {
    setCurrentSectionForMedia(sectionId);
    setShowMediaPicker(true);
  };

  const handleSelectMedia = (imageUrl: string) => {
    if (currentSectionForMedia) {
      setSections(prev =>
        prev.map(section =>
          section.id === currentSectionForMedia
            ? { ...section, image: imageUrl }
            : section
        )
      );
    }
    setShowMediaPicker(false);
    setCurrentSectionForMedia(null);
  };

  const handleRewrite = async (selectedText: string, customPrompt?: string): Promise<string> => {
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: selectedText,
          customPrompt 
        }),
      });

      if (!response.ok) throw new Error('Rewrite failed');

      const data = await response.json();
      return data.rewrittenText;
    } catch (error) {
      console.error('Rewrite error:', error);
      return selectedText;
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      
      // Create a temporary container with the page content
      const element = document.createElement('div');
      element.style.width = '800px';
      element.style.padding = '40px';
      element.style.backgroundColor = 'white';
      element.style.fontFamily = 'Manrope, sans-serif';
      
      // Add title
      const title = document.createElement('h1');
      title.textContent = pageTitle;
      title.style.fontSize = '48px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '20px';
      element.appendChild(title);
      
      // Add sections
      sections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.style.marginBottom = '40px';
        
        const sectionTitle = document.createElement('h2');
        sectionTitle.textContent = section.title;
        sectionTitle.style.fontSize = '32px';
        sectionTitle.style.fontWeight = '600';
        sectionTitle.style.marginBottom = '16px';
        sectionEl.appendChild(sectionTitle);
        
        const content = document.createElement('p');
        content.textContent = section.content;
        content.style.fontSize = '16px';
        content.style.lineHeight = '1.8';
        sectionEl.appendChild(content);
        
        element.appendChild(sectionEl);
      });
      
      document.body.appendChild(element);
      
      // Generate PDF
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
      });
      
      document.body.removeChild(element);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${pageTitle || 'page'}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      let markdown = `# ${pageTitle}\n\n`;
      
      sections.forEach(section => {
        markdown += `## ${section.title}\n\n`;
        // Strip HTML tags for clean markdown
        const textContent = section.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        markdown += `${textContent}\n\n`;
      });
      
      // Create blob and download
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pageTitle || 'page'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Markdown generation error:', error);
      alert('Failed to generate Markdown. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Navbar 
          pageTitle={pageTitle} 
          status={isWriting ? "Writing..." : undefined}
          onDownloadPDF={sections.length > 0 ? handleDownloadPDF : undefined}
          onChatClick={sections.length > 0 ? () => setShowChat(true) : undefined}
        />

        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 max-w-3xl mx-auto px-8 py-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Hero Image */}
              {heroImage && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-12 relative group"
                >
                  <div className="w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden relative">
                    <img 
                      src={heroImage} 
                      alt={pageTitle}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button className="px-4 py-2 bg-white text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                        Change
                      </button>
                      <button 
                        onClick={() => setHeroImage("")}
                        className="px-4 py-2 bg-white text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Title */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <h1 className="text-6xl font-serif font-bold mb-4 text-foreground">
                  {pageTitle}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span>Curated by hyperbrowser</span>
                  <span>•</span>
                  <span>{sections.length * 2} min read</span>
                </div>
              </motion.div>

              {/* Sections */}
              <AnimatePresence>
                {sections.map((section, index) => (
                  <motion.section
                    key={section.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0, duration: 0.3 }}
                    className="mb-16"
                    id={section.id}
                  >
                    <div className="flex items-start justify-between mb-6 group">
                      <h2 
                        className="text-3xl font-serif font-semibold text-foreground flex-1 focus:outline-none"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newTitle = e.currentTarget.textContent?.trim();
                          if (newTitle && newTitle !== section.title) {
                            setSections(prev => prev.map(s => 
                              s.id === section.id ? { ...s, title: newTitle } : s
                            ));
                          }
                        }}
                      >
                        {section.title}
                      </h2>
                      <button 
                        onClick={() => handleDeleteSection(section.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg flex-shrink-0 ml-4"
                        title="Delete section"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>

                    {/* Image with skeleton loader */}
                    {section.image ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="mb-6 relative group"
                      >
                        <img
                          src={section.image}
                          alt={section.title}
                          className="w-full h-80 object-cover rounded-2xl"
                          loading="lazy"
                        />
                        <button 
                          onClick={() => handleAddMedia(section.id)}
                          className="absolute top-4 right-4 px-4 py-2 bg-white text-sm font-medium rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                        >
                          Change
                        </button>
                      </motion.div>
                    ) : isLoadingImages ? (
                      <div className="w-full h-80 mb-6 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-2xl animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-shimmer" />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddMedia(section.id)}
                        className="w-full py-8 mb-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-muted hover:text-foreground"
                      >
                        <ImageIcon className="w-5 h-5" />
                        <span className="font-medium">Add Media</span>
                      </button>
                    )}

                    <div 
                      className={index === 0 ? "drop-cap text-xl leading-relaxed text-foreground font-normal" : "text-xl leading-relaxed text-foreground font-normal"}
                      contentEditable={!section.isStreaming}
                      suppressContentEditableWarning
                    >
                      {section.content ? (
                        section.isStreaming ? (
                          <StreamingText 
                            text={section.content} 
                            speed={15}
                            onComplete={() => handleStreamComplete(section.id)}
                          />
                        ) : (
                          <span dangerouslySetInnerHTML={{ __html: section.content }} />
                        )
                      ) : (
                        <div className="space-y-3">
                          <div className="h-5 bg-gray-100 rounded w-full animate-pulse" />
                          <div className="h-5 bg-gray-100 rounded w-11/12 animate-pulse" />
                          <div className="h-5 bg-gray-100 rounded w-full animate-pulse" />
                          <div className="h-5 bg-gray-100 rounded w-10/12 animate-pulse" />
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => handleInsertSection(section.id)}
                      className="w-full py-4 mt-8 text-sm text-muted hover:text-foreground transition-colors flex items-center justify-center gap-2"
                    >
                      + Insert Section
                    </button>
                  </motion.section>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right Sidebar - TOC & Sources */}
          <aside className="w-80 sticky top-20 h-[calc(100vh-5rem)] p-8 border-l border-border hide-scrollbar overflow-y-auto">
            <div className="space-y-8">
              {/* Table of Contents */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-6">
                  Table of Contents
                </h3>
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                      setActiveSection(section.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-all relative ${
                      activeSection === section.id
                        ? "text-foreground font-normal"
                        : "text-gray-400 hover:text-foreground font-normal"
                    }`}
                  >
                    {activeSection === section.id && (
                      <motion.div
                        layoutId="activeSection"
                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-black"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                    {section.title}
                  </button>
                ))}
              </div>

              {/* Sources Section */}
              <div className="pt-8 border-t border-border">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                  Sources
                </h3>
                {loadingSources ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" />
                      <span>Thinking...</span>
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-100 rounded mb-2" />
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : sources.length > 0 ? (
                  <div className="space-y-4">
                    {sources.map((source, idx) => (
                      <motion.a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="block p-3 rounded-lg border border-gray-200 hover:border-black hover:bg-gray-50 transition-all group"
                      >
                        <div className="text-sm font-medium text-foreground mb-2 group-hover:underline">
                          {source.title}
                        </div>
                        {source.snippet && (
                          <p className="text-xs text-muted leading-relaxed mb-2 line-clamp-2">
                            {source.snippet}
                          </p>
                        )}
                        <div className="text-xs text-gray-400 truncate">
                          {source.url}
                        </div>
                      </motion.a>
                    ))}
                    <div className="text-xs text-muted text-center pt-2">
                      Powered by{" "}
                      <a 
                        href="https://hyperbrowser.ai" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Hyperbrowser
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    <p className="mb-2">Sources unavailable</p>
                    <p className="text-xs leading-relaxed">
                      Powered by{" "}
                      <a 
                        href="https://hyperbrowser.ai" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-gray-600"
                      >
                        Hyperbrowser
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Media Picker Modal */}
      <AnimatePresence>
        {showMediaPicker && (
          <MediaPickerModal
            onClose={() => setShowMediaPicker(false)}
            onSelect={handleSelectMedia}
            sectionTitle={sections.find(s => s.id === currentSectionForMedia)?.title || topic}
          />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        pageUrl={`https://pages.hyperbrowser.ai/p/${slug}`}
        pageTitle={pageTitle}
        onDownloadPDF={handleDownloadPDF}
        onDownloadMarkdown={handleDownloadMarkdown}
      />

      {/* Text Selection Toolbar */}
      <TextSelectionToolbar onRewrite={handleRewrite} />

      {/* Chat Panel */}
      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        pageContent={sections.map(s => {
          // Strip HTML tags for clean text
          const textContent = s.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
          return `${s.title}\n${textContent}`;
        }).join('\n\n')}
        topic={topic}
      />
    </div>
  );
}

function MediaPickerModal({ 
  onClose, 
  onSelect,
  sectionTitle 
}: { 
  onClose: () => void; 
  onSelect: (url: string) => void;
  sectionTitle: string;
}) {
  const [searchQuery, setSearchQuery] = useState(sectionTitle);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUnsplash = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/images/unsplash?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Unsplash error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Add Media</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-2xl leading-none">
              ×
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUnsplash()}
              placeholder="Search for images..."
              className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            <Button 
              variant="primary" 
              onClick={searchUnsplash}
              disabled={loading}
            >
              Search
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="aspect-video bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {images.map((img) => (
                <motion.button
                  key={img.id}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => onSelect(img.url)}
                  className="aspect-video rounded-lg overflow-hidden border border-border hover:border-black transition-all"
                >
                  <img src={img.thumb} alt={img.description} className="w-full h-full object-cover" />
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted py-12">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No images found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted">Loading editor...</p>
        </div>
      </div>
    }>
      <EditorPageContent />
    </Suspense>
  );
}
