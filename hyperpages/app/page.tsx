"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useRouter } from "next/navigation";

const AUDIENCES = ["Anyone", "Beginner", "Expert", "Student", "Professional"];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("Anyone");
  const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);
  const router = useRouter();

  const handleSubmit = () => {
    if (topic.trim()) {
      router.push(`/editor?topic=${encodeURIComponent(topic)}&audience=${audience}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Navbar />
        <div className="max-w-4xl mx-auto px-8 py-24">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="What's your Page about?"
                className="w-full px-2 py-6 text-5xl bg-transparent border-none focus:outline-none placeholder:text-gray-300 text-foreground font-normal"
              />
              <div className="absolute bottom-0 left-0 right-16 h-px bg-gray-200" />
              <button
                onClick={handleSubmit}
                disabled={!topic.trim()}
                className="absolute right-0 bottom-3 w-14 h-14 bg-gray-200 text-foreground rounded-xl hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
        </div>

            <div className="relative mt-6">
              <button
                onClick={() => setShowAudienceDropdown(!showAudienceDropdown)}
                className="flex items-center gap-2 px-2 py-2 text-base text-muted hover:text-foreground transition-colors"
              >
                <span className="font-normal">Audience:</span>
                <span>{audience}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showAudienceDropdown && (
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute top-full left-0 mt-2 w-48 bg-white border border-border rounded-lg shadow-lg overflow-hidden z-10"
                >
                  {AUDIENCES.map((aud) => (
                    <button
                      key={aud}
                      onClick={() => {
                        setAudience(aud);
                        setShowAudienceDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
          >
                      {aud}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
