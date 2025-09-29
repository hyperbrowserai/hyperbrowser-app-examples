"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import LeadForm from "../components/LeadForm";
import LeadsTable from "../components/LeadsTable";
import TableSkeleton from "../components/TableSkeleton";
import { DownloadBtn } from "../components/DownloadBtn";
import LiveConsole from "../components/LiveConsole";
import Progress from "../components/Progress";

export default function Home() {
  const [leads, setLeads] = useState<any[]>([]);
  const [csv, setCsv] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [pct, setPct] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /** helper to push log lines & animate progress */
  function log(msg: string, nextPct?: number) {
    setLogs(prev => [...prev, msg]);
    if (nextPct !== undefined) setPct(nextPct);
  }

  async function handleSubmit(query: string, city: string) {
    // reset
    setLogs([]); setLeads([]); setCsv(""); setPct(0); setIsLoading(true);

    log(`Starting Hyperleads research: "${query}" in ${city}`, 5);
    try {
      log(`Creating Hyperbrowser session...`, 10);
      log(`Targeting: Yelp, Google Maps, Yellow Pages`, 15);
      
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, city })
      });
      
      log(`Hyperleads crawling and extraction in progress...`, 30);
      log(`Using AI to extract structured data...`, 60);
      log(`Claude filtering for relevance...`, 80);
      log(`Processing results...`, 90);

      const responseData = await res.json();
      console.log('Frontend: API Response:', responseData);

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      const { leads: L, csv: C, metadata } = responseData;

      console.log('Frontend: Leads received:', L?.length || 0);
      setLeads(L || []);
      setCsv(C || '');

      log(`Research complete: ${L?.length || 0} relevant leads (${metadata?.originalCount || 0} filtered) from ${metadata?.sources?.length || 0} sources`, 95);
      log(`Ready for download! Duration: ${metadata?.duration ? Math.round(metadata.duration/1000) : '?'}s`, 100);
    } catch (err: any) {
      log(`Research failed: ${err.message}`, 100);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.12 }}
        className="text-center mb-16 mt-16"
      >
        <h1 className="hero-title">
          <span className="text-gray-400">
            Hyper
            </span>
          Leads</h1>
        <p className="hero-subtitle">AI-powered research with precision filtering</p>
        
        <div className="mt-4  flex flex-col items-center justify-center space-y-5">
          <span className="text-sm text-muted-foreground">Powered by</span>
          <div className="flex items-center space-x-6">
            <a href="https://hyperbrowser.ai" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <Image 
                  src="/wordmark.svg" 
                  alt="Hyperbrowser" 
                  width={130} 
                  height={40}
                />
              </div>
            </a>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">+</span>
              <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/5 transition-colors">
               
                <span className="text-sm font-medium">Claude 4.5 Sonnet</span>
              </a>
            </div>
          </div>
        </div>
      </motion.div>

      {/* form */}
      <LeadForm onSubmit={handleSubmit} />

      {/* progress */}
      <Progress pct={pct} />

      {/* results */}
      {isLoading && leads.length === 0 ? (
        <TableSkeleton rows={6} progress={pct} />
      ) : (
        <LeadsTable leads={leads} />
      )}
      <DownloadBtn csv={csv} />

      {/* live console */}
      <LiveConsole logs={logs} />
    </div>
  );
}