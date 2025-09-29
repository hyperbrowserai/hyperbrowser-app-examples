"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function LeadForm({
  onSubmit
}: {
  onSubmit: (query: string, city: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(query, city);
    } catch (error) {
      console.error("Search error:", error);
      alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="card"
    >
      <form onSubmit={submit} className="grid-16">
        <div>
          <label htmlFor="query" className="block text-left text-sm font-medium mb-2">
            What leads are you looking for?
          </label>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              id="query"
              className="w-full shadow-sm"
              style={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                paddingLeft: '44px',
                paddingRight: '16px'
              }}
              placeholder="Real Estate Agents"
              value={query}
              onChange={e => setQuery(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="city" className="block text-left text-sm font-medium mb-2">
            Target location
          </label>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <input
              id="city"
              className="w-full shadow-sm"
              style={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                paddingLeft: '44px',
                paddingRight: '16px'
              }}
              placeholder="New York"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
          </div>
        </div>
        
        <button
          className="w-full bg-accent text-black"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </span>
          ) : (
            <span className="font-semibold">Find Leads</span>
          )}
        </button>
      </form>
    </motion.div>
  );
} 