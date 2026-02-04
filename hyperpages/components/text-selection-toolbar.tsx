"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Type, Palette, Highlighter, Sparkles, Edit3 } from "lucide-react";

interface TextSelectionToolbarProps {
  onRewrite: (selectedText: string, customPrompt?: string) => Promise<string>;
}

export default function TextSelectionToolbar({ onRewrite }: TextSelectionToolbarProps) {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isRewriting, setIsRewriting] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCustomEdit, setShowCustomEdit] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<Range | null>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0 && selection && selection.rangeCount > 0) {
        setSelectedText(text);
        const range = selection.getRangeAt(0);
        savedSelection.current = range.cloneRange(); // Save selection
        const rect = range.getBoundingClientRect();

        if (rect) {
          setPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
          setShowToolbar(true);
        }
      } else if (!showCustomEdit) {
        setShowToolbar(false);
      }
    };

    document.addEventListener("mouseup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
    };
  }, [showCustomEdit]);

  const handleRewriteClick = async (prompt?: string) => {
    setIsRewriting(true);
    setShowCustomEdit(false);
    try {
      const rewrittenText = await onRewrite(selectedText, prompt);
      
      // Restore and replace the text using saved selection
      if (savedSelection.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedSelection.current);
        
        savedSelection.current.deleteContents();
        savedSelection.current.insertNode(document.createTextNode(rewrittenText));
      }
    } catch (error) {
      console.error('Rewrite error:', error);
    } finally {
      setIsRewriting(false);
      setShowToolbar(false);
      setCustomPrompt("");
    }
  };

  const handleBold = () => {
    if (savedSelection.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelection.current);
      document.execCommand('bold');
    }
    setShowToolbar(false);
  };

  const handleHighlight = () => {
    if (savedSelection.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelection.current);
      
      const span = document.createElement("span");
      span.className = "bg-yellow-200";
      try {
        savedSelection.current.surroundContents(span);
      } catch (e) {
        console.error('Highlight error:', e);
      }
    }
    setShowToolbar(false);
  };

  const handleTextColor = (color: string) => {
    if (savedSelection.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelection.current);
      
      const span = document.createElement("span");
      span.style.color = color;
      try {
        savedSelection.current.surroundContents(span);
      } catch (e) {
        console.error('Color error:', e);
      }
    }
    setShowColorPicker(false);
    setShowToolbar(false);
  };

  return (
    <AnimatePresence>
      {showToolbar && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            transform: "translateX(-50%) translateY(-100%)",
          }}
          className="z-50"
        >
          {showCustomEdit ? (
            <div className="bg-black text-white rounded-lg shadow-lg p-3 w-80">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customPrompt && handleRewriteClick(customPrompt)}
                placeholder="e.g., Convert to table, Make formal..."
                className="w-full px-3 py-2 bg-gray-800 rounded text-sm focus:outline-none focus:ring-2 focus:ring-white mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => customPrompt && handleRewriteClick(customPrompt)}
                  disabled={!customPrompt}
                  className="flex-1 px-3 py-1.5 bg-white text-black rounded text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setShowCustomEdit(false);
                    setCustomPrompt("");
                  }}
                  className="px-3 py-1.5 bg-gray-800 rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : isRewriting ? (
            <div className="bg-black text-white rounded-lg shadow-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium">Editing...</span>
              </div>
            </div>
          ) : (
            <div className="bg-black text-white rounded-lg shadow-lg flex items-center divide-x divide-gray-700">
              <button
                onClick={() => handleRewriteClick()}
                className="px-3 py-2 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium rounded-l-lg"
                title="Rewrite with AI"
              >
                <Sparkles className="w-4 h-4" />
                Rewrite
              </button>
              
              <button
                onClick={() => setShowCustomEdit(true)}
                className="px-3 py-2 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium"
                title="Custom edit"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              
              <button
                onClick={handleBold}
                className="px-3 py-2 hover:bg-gray-800 transition-colors"
                title="Make bold"
              >
                <Type className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleHighlight}
                className="px-3 py-2 hover:bg-gray-800 transition-colors"
                title="Highlight"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="px-3 py-2 hover:bg-gray-800 transition-colors rounded-r-lg"
                  title="Text color"
                >
                  <Palette className="w-4 h-4" />
                </button>
                
                {showColorPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg p-2 flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'].map(color => (
                      <button
                        key={color}
                        onClick={() => handleTextColor(color)}
                        className="w-6 h-6 rounded border-2 border-gray-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

