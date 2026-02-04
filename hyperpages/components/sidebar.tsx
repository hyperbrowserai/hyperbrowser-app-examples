"use client";

import { Library, Plus, MoreVertical, Pencil, Trash2, Edit3 } from "lucide-react";
import Logo from "./logo";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPages, deletePage, savePage, type Page } from "@/lib/storage";

export default function Sidebar() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    loadPages();
    // Listen for custom event to update when pages are saved
    const handleStorageChange = () => {
      loadPages();
    };
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener('pagesUpdated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pagesUpdated', handleStorageChange);
    };
  }, []);

  const loadPages = () => {
    try {
      const storedPages = getPages();
      setPages(storedPages);
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (slug: string) => {
    if (confirm('Are you sure you want to delete this page?')) {
      deletePage(slug);
      loadPages();
      setMenuOpen(null);
      router.push('/');
    }
  };

  const handleRename = (page: Page) => {
    setRenamePageId(page.id);
    setNewTitle(page.title);
    setMenuOpen(null);
  };

  const saveRename = (page: Page) => {
    if (newTitle.trim() && newTitle !== page.title) {
      const updatedPage = { ...page, title: newTitle };
      savePage(updatedPage);
      loadPages();
    }
    setRenamePageId(null);
    setNewTitle("");
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-white flex flex-col"
    >
      <div className="p-6">
        <Logo />
      </div>

      <nav className="flex-1 px-3 overflow-y-auto hide-scrollbar">
        <button
          onClick={() => router.push('/')}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 mb-6 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Page</span>
        </button>

        <div className="space-y-1">
          <NavItem icon={<Library className="w-5 h-5" />} label="Library" active />
        </div>

        {loading ? (
          <div className="mt-8 px-4">
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ) : pages.length > 0 && (
          <div className="mt-8">
            <h3 className="px-4 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Your Pages
            </h3>
            <div className="space-y-1">
              {pages.map((page) => (
                <div key={page.id} className="relative group">
                  {renamePageId === page.id ? (
                    <div className="px-4 py-2.5">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(page);
                          if (e.key === 'Escape') setRenamePageId(null);
                        }}
                        onBlur={() => saveRename(page)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button
                        onClick={() => router.push(`/p/${page.slug}`)}
                        className="flex-1 px-4 py-2.5 text-sm text-left rounded-lg hover:bg-gray-50 transition-colors truncate font-normal"
                        title={page.title}
                      >
                        {page.title}
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === page.id ? null : page.id);
                          }}
                          className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
                        >
                          <MoreVertical className="w-4 h-4 text-muted" />
                        </button>
                        
                        <AnimatePresence>
                          {menuOpen === page.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                            >
                              <button
                                onClick={() => {
                                  const topic = page.topic || page.title;
                                  const audience = page.audience || 'Anyone';
                                  router.push(`/editor?topic=${encodeURIComponent(topic)}&audience=${encodeURIComponent(audience)}`);
                                  setMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleRename(page)}
                                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Pencil className="w-4 h-4" />
                                Rename
                              </button>
                              <button
                                onClick={() => handleDelete(page.slug)}
                                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 text-red-600 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted text-center">
          Built with{" "}
          <a
            href="https://hyperbrowser.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Hyperbrowser
          </a>
        </p>
      </div>
    </motion.aside>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
        active ? "bg-gray-100" : "hover:bg-gray-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

