"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Share2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Button from "@/components/button";
import ShareModal from "@/components/share-modal";
import { getPageBySlug, type Page } from "@/lib/storage";

export default function PublishedPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadPage = () => {
    try {
      const foundPage = getPageBySlug(slug);
      if (foundPage) {
        setPage(foundPage);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error loading page:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-serif font-bold mb-4">Page Not Found</h1>
          <p className="text-muted mb-8">The page you're looking for doesn't exist or has been removed.</p>
          <Button variant="primary" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const pageUrl = `https://pages.hyperbrowser.ai/p/${page.slug}`;

  const handleDownloadPDF = () => {
    console.log('PDF download not available for published pages');
  };

  const handleDownloadMarkdown = () => {
    const markdown = `# ${page.title}\n\n${page.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n')}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur-sm"
      >
        <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to HyperPages
          </button>

          <Button variant="secondary" icon={Share2} onClick={() => setShowShareModal(true)}>
            Share
          </Button>
        </div>
      </motion.header>

      <main className="max-w-3xl mx-auto px-8 py-16">
        {/* Hero Image */}
        {page.hero_image && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <img
              src={page.hero_image}
              alt={page.title}
              className="w-full h-[500px] object-cover rounded-2xl"
            />
          </motion.div>
        )}

        {/* Title & Meta */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-16"
        >
          <h1 className="text-6xl font-serif font-bold mb-6 text-foreground leading-tight">
            {page.title}
          </h1>
          <div className="flex items-center gap-4 text-base text-muted">
            <span>Curated by hyperbrowser</span>
            <span>•</span>
            <span>{page.sections.length * 2} min read</span>
            <span>•</span>
            <span>{new Date(page.created_at).toLocaleDateString()}</span>
          </div>
        </motion.div>

        {/* Content */}
        {page.sections.map((section, index) => (
          <motion.article
            key={section.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="mb-20"
          >
            <h2 className="text-4xl font-serif font-semibold mb-8 text-foreground">
              {section.title}
            </h2>

            {section.image && (
              <div className="mb-8">
                <img
                  src={section.image}
                  alt={section.title}
                  className="w-full h-96 object-cover rounded-2xl"
                />
              </div>
            )}

            <div 
              className={index === 0 ? "drop-cap text-xl leading-relaxed text-foreground mb-6 font-normal" : "text-xl leading-relaxed text-foreground mb-6 font-normal"}
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </motion.article>
        ))}

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-24 pt-12 border-t border-border text-center"
        >
          <p className="text-base text-muted mb-4">
            <strong>Built with <a href="https://hyperbrowser.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Hyperbrowser</a></strong>
          </p>
          <p className="text-sm text-muted">
            Follow <a href="https://twitter.com/hyperbrowser" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">@hyperbrowser</a> for updates.
          </p>
        </motion.footer>
      </main>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        pageUrl={pageUrl}
        pageTitle={page.title}
        onDownloadPDF={handleDownloadPDF}
        onDownloadMarkdown={handleDownloadMarkdown}
      />
    </div>
  );
}

