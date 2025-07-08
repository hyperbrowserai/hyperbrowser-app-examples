'use client'

import { useState, useRef } from 'react'
import { Search, Download, ExternalLink, Zap, FileText, Database, Sparkles } from 'lucide-react'

interface Citation {
  id: number
  url: string
  title: string
  quote: string
  domain: string
  isAcademic: boolean
  endpoints: Array<{
    method: string
    url: string
    status: number
  }>
}

interface ResearchResult {
  answerMarkdown: string
  citations: Citation[]
  postmanCollection: any
  endpointManifest: any
  zipFile: string
  creditsUsed: number
  questionType: string
  stats: {
    sources: number
    endpoints: number
    citations: number
  }
}

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [showConsole, setShowConsole] = useState(false)
  const consoleRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setProgress(0)
    setLogs([])
    setResult(null)
    setShowConsole(true)

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
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
                setLogs(prev => {
                  const newLogs = [...prev, data.message]
                  setTimeout(() => {
                    if (consoleRef.current) {
                      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
                    }
                  }, 100)
                  return newLogs
                })
              } else if (data.type === 'complete') {
                setResult(data.result)
                setProgress(100)
                setIsLoading(false)
              } else if (data.type === 'error') {
                setLogs(prev => [...prev, `❌ Error: ${data.error}`])
                setIsLoading(false)
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }
    } catch (error) {
      console.error('Request failed:', error)
      setLogs(prev => [...prev, `❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`])
      setIsLoading(false)
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadZip = () => {
    if (!result?.zipFile) return
    
    const binaryString = atob(result.zipFile)
    const length = binaryString.length
    const bytes = new Uint8Array(length)
    
    for (let i = 0; i < length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    const blob = new Blob([bytes], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sourceforge-output.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderAnswerWithCitations = (markdown: string, citations: Citation[]) => {
    let html = markdown

    // First, clean up the markdown to remove unwanted content
    // Remove base64 images and data URIs
    html = html.replace(/!\[.*?\]\(data:image\/[^)]+\)/g, '')
    html = html.replace(/data:image\/[^)]+/g, '')
    
    // Remove image markdown but keep alt text
    html = html.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    
    // Remove HTML img tags
    html = html.replace(/<img[^>]*>/gi, '')
    
    // Remove any remaining HTML tags except basic formatting
    html = html.replace(/<(?!\/?(b|strong|i|em|u|br|p|div|span|h[1-6]|ul|ol|li|code|pre))[^>]*>/gi, '')
    
    // Remove links that are just images or logos
    html = html.replace(/\[!\[.*?\]\([^)]+\)\]\([^)]+\)/g, '')
    
    // Remove "References" section from the main content (we'll show it separately)
    html = html.replace(/## References[\s\S]*$/i, '')
    html = html.replace(/# References[\s\S]*$/i, '')
    
    // Convert markdown to basic HTML
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mb-3 mt-6">$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white mb-4 mt-8">$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mb-6 mt-8">$1</h1>')
    
    // Handle code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-black/50 border border-white/10 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-accent font-mono text-sm">$2</code></pre>')
    html = html.replace(/`([^`]+)`/g, '<code class="bg-accent/20 text-accent px-2 py-1 rounded font-mono text-sm">$1</code>')
    
    // Handle lists
    html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
    
    // Handle bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    
    // Clean up excessive whitespace
    html = html.replace(/\s+/g, ' ')
    html = html.replace(/\n\s*\n/g, '\n\n')
    
    // Handle line breaks
    html = html.replace(/\n\n/g, '</p><p class="mb-4 text-gray-300 leading-relaxed">')
    html = `<p class="mb-4 text-gray-300 leading-relaxed">${html}</p>`

    // Handle citations with clickable links and enhanced tooltips
    citations.forEach(citation => {
      const citationRegex = new RegExp(`\\[${citation.id}\\]`, 'g')
      const academicBadge = citation.isAcademic ? '<span class="text-xs bg-blue-500/20 text-blue-400 px-1 rounded">Academic</span>' : ''
      
      html = html.replace(citationRegex, `
        <span class="citation-hover inline-block">
          <a href="${citation.url}" target="_blank" rel="noopener noreferrer" 
             class="bg-accent text-black px-2 py-1 rounded-full text-xs font-bold cursor-pointer hover:bg-accent/80 transition-colors">
            [${citation.id}]
          </a>
          <div class="citation-tooltip">
            <div class="font-semibold text-white mb-1">${citation.title}</div>
            <div class="text-xs text-gray-300 mb-2">${citation.quote.substring(0, 120)}...</div>
            <div class="text-xs text-accent mb-1">${citation.domain}</div>
            ${academicBadge}
          </div>
        </span>
      `)
    })

    return { __html: html }
  }

  return (
    <div className="min-h-screen" style={{ background: '#060606' }}>
      {/* Navbar */}
      <nav className="bg-black/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-accent" />
              <span className="text-xl font-bold text-white tracking-tight4">
                OpenAI <span className="text-accent">SourceForge</span>
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a
                href="https://docs.hyperbrowser.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-gray-200 transition-colors font-medium tracking-tight4"
              >
                <FileText className="w-4 h-4" />
                <span>Docs</span>
              </a>
              <a
                href="https://hyperbrowser.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors tracking-tight4 font-medium"
                style={{
                  background: 'linear-gradient(135deg, #FFFD39 0%, #F0F019 100%)',
                  color: '#000000'
                }}
              >
                <span>Get API Key</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <h1 className="text-6xl font-bold text-white tracking-tight4">
              OpenAI <span className="text-accent">SourceForge</span>
            </h1>
          </div>
          <p className="text-lg text-gray-400 tracking-tight4 max-w-2xl mx-auto">
            Drop in any question → get real-time answers with live source citations and developer-ready API samples.
            Powered by <span className="text-accent font-semibold">Hyperbrowser</span> + <span className="text-accent font-semibold">GPT-4o</span>
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-2xl p-8 mb-8" style={{
          background: 'linear-gradient(135deg, rgba(255, 253, 57, 0.1) 0%, rgba(0, 0, 0, 0.8) 50%, rgba(255, 253, 57, 0.05) 100%)',
          border: '1px solid rgba(255, 253, 57, 0.2)'
        }}>
          {/* Progress Bar */}
          {isLoading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Research Progress</span>
                <span className="text-sm text-accent font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500 animate-pulse-glow"
                  style={{ 
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #FFFD39 0%, #F0F019 100%)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Question
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything... e.g., 'How to implement OAuth2 in Node.js?' or 'Best practices for React performance?'"
                rows={4}
                className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors resize-none"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="w-full py-4 px-6 rounded-lg font-semibold text-black transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading ? '#666' : 'linear-gradient(135deg, #FFFD39 0%, #F0F019 100%)',
              }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                  <span>Researching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Ask SourceForge</span>
                </>
              )}
            </button>
          </form>

          {/* Console */}
          {showConsole && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Live Console</h3>
                <button
                  onClick={() => setShowConsole(!showConsole)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {showConsole ? 'Hide' : 'Show'}
                </button>
              </div>
              <div 
                ref={consoleRef}
                className="terminal-bg rounded-lg p-4 h-48 overflow-y-auto scrollbar-hide"
              >
                {logs.map((log, index) => (
                  <div key={index} className="terminal-text text-sm mb-1 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-8 animate-in">
            {/* Answer */}
            <div className="glass-card rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Sparkles className="w-6 h-6 text-accent mr-3" />
                AI Answer
              </h2>
              <div 
                dangerouslySetInnerHTML={renderAnswerWithCitations(result.answerMarkdown, result.citations)}
                className="prose prose-invert max-w-none"
              />
            </div>

            {/* References */}
            {result.citations.length > 0 && (
              <div className="glass-card rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <ExternalLink className="w-6 h-6 text-accent mr-3" />
                  References
                </h2>
                <div className="space-y-4">
                  {result.citations.map((citation, index) => (
                    <div key={citation.id} className="border-l-4 border-accent/30 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-accent text-black px-2 py-1 rounded-full text-xs font-bold">
                              [{citation.id}]
                            </span>
                            {citation.isAcademic && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                Academic Source
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-white mb-2 leading-tight">
                            {citation.title}
                          </h3>
                          <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                            {citation.quote}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {citation.domain}
                            </span>
                            {citation.endpoints.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                {citation.endpoints.length} API endpoints
                              </span>
                            )}
                          </div>
                        </div>
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 bg-accent/20 hover:bg-accent/30 text-accent px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visit
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Downloads */}
            <div className="glass-card rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Download className="w-6 h-6 text-accent mr-3" />
                Downloads
              </h2>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => downloadFile(JSON.stringify(result.postmanCollection, null, 2), 'postman-collection.json', 'application/json')}
                  className="glass-card p-4 rounded-lg hover:border-accent/50 transition-colors text-left"
                >
                  <Database className="w-8 h-8 text-accent mb-2" />
                  <div className="font-semibold text-white">Postman Collection</div>
                  <div className="text-sm text-gray-400">Import & test APIs</div>
                </button>

                <button
                  onClick={() => downloadFile(JSON.stringify(result.endpointManifest, null, 2), 'endpoint-manifest.json', 'application/json')}
                  className="glass-card p-4 rounded-lg hover:border-accent/50 transition-colors text-left"
                >
                  <FileText className="w-8 h-8 text-accent mb-2" />
                  <div className="font-semibold text-white">Endpoint Manifest</div>
                  <div className="text-sm text-gray-400">Structured API data</div>
                </button>

                <button
                  onClick={downloadZip}
                  className="glass-card p-4 rounded-lg hover:border-accent/50 transition-colors text-left"
                >
                  <Download className="w-8 h-8 text-accent mb-2" />
                  <div className="font-semibold text-white">Complete Package</div>
                  <div className="text-sm text-gray-400">Everything as ZIP</div>
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-white/10">
                <div>
                  Used <span className="text-accent font-semibold">{result.creditsUsed}</span> Hyperbrowser credits
                </div>
                <div className="flex space-x-4">
                  <span>{result.stats.sources} sources</span>
                  <span>{result.stats.endpoints} endpoints</span>
                  <span>{result.stats.citations} citations</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-sm text-gray-500 font-medium tracking-tight4">
                Need more credits?{' '}
                <a
                  href="https://hyperbrowser.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-white font-medium transition-colors"
                >
                  hyperbrowser.ai
                </a>
                {' • '}
                <a
                  href="https://docs.hyperbrowser.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Documentation
                </a>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
