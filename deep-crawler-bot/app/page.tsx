'use client'

import { useState } from 'react'
import UrlForm from '../components/UrlForm'
import ProgressBar from '../components/ProgressBar'
import ResultCard from '../components/ResultCard'
import EndpointList from '../components/EndpointList'
import TerminalSidebar from '../components/TerminalSidebar'
import Navbar from '../components/Navbar'

interface ApiEndpoint {
  method: string
  url: string
  status: number
  size: number
}

interface CrawlResult {
  endpoints: ApiEndpoint[]
  postmanCollection: any
  crawlId: string
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CrawlResult | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleCrawl = async (url: string, options: { sameOriginOnly: boolean }) => {
    setIsLoading(true)
    setProgress(0)
    setResult(null)
    setLogs([])
    setSidebarOpen(true)

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, sameOriginOnly: options?.sameOriginOnly ?? true }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'progress') {
                setProgress(data.progress)
              } else if (data.type === 'log') {
                setLogs(prev => [...prev, data.message])
              } else if (data.type === 'complete') {
                setResult(data.result)
                setProgress(100)
                setIsLoading(false)
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }
    } catch (error) {
      console.error('Crawl failed:', error)
      setLogs(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`])
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-12">
          <img src="/logo.svg" alt="DeepCrawler logo" className="mx-auto mb-5 h-10 w-auto" />
          <h1 className="font-manrope font-semibold tracking-tight-2 text-5xl md:text-6xl">
            <span className="text-gray-400">Deep</span>
            <span className="text-white">Crawler</span>
          </h1>
          <p className="mt-6 font-dmmono font-medium tracking-tight-2 text-xs md:text-sm text-gray-400 uppercase">
            Unlock hidden APIs in seconds from any website
          </p>
          <p className="mt-3 font-dmmono tracking-tight-2 text-[10px] md:text-xs text-gray-500 uppercase">
            An open-source project powered by Hyperbrowser.ai<br />
            Connect your Hyperbrowser API keys to get started
          </p>
        </div>

        <div className="relative rounded-2xl p-6 md:p-8 overflow-hidden bg-black/40 border border-gray-700/40">
          <ProgressBar progress={progress} isLoading={isLoading} />

          <UrlForm onSubmit={handleCrawl} isLoading={isLoading} />

          {result && (
            <div className="mt-8 animate-in fade-in duration-500">
              <ResultCard
                endpointCount={result.endpoints.length}
                crawlId={result.crawlId}
                postmanCollection={result.postmanCollection}
              />
              <EndpointList endpoints={result.endpoints} />
            </div>
          )}
        </div>

        {result && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-medium tracking-tight4">
              Powered by{' '}
              <a
                href="https://hyperbrowser.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white font-medium transition-colors"
              >
                Hyperbrowser
              </a>
              {' • '}
              <a
                href="https://docs.hyperbrowser.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Get your API key
              </a>
            </p>
          </div>
        )}
      </main>

      <TerminalSidebar
        logs={logs}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
    </div>
  )
}
