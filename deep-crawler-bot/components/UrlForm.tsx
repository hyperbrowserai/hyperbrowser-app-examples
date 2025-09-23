'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

interface UrlFormProps {
  onSubmit: (url: string, options: { sameOriginOnly: boolean }) => void
  isLoading: boolean
}

export default function UrlForm({ onSubmit, isLoading }: UrlFormProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [sameOriginOnly, setSameOriginOnly] = useState<boolean>(true)

  const validateUrl = (input: string): boolean => {
    try {
      const url = new URL(input)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
    
    if (!validateUrl(normalizedUrl)) {
      setError('Please enter a valid URL')
      return
    }

    onSubmit(normalizedUrl, { sameOriginOnly })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="relative">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hyperbrowser.ai"
          className="w-full px-5 py-4 pr-12 rounded-xl border border-gray-700/50 bg-black/40 placeholder-gray-500 text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F0FF26] focus:border-[color:var(--accent)] transition-colors font-regular tracking-tight4"
          disabled={isLoading}
        />
        <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-300">
        <input
          id="same-origin-only"
          type="checkbox"
          checked={sameOriginOnly}
          onChange={(e) => setSameOriginOnly(e.target.checked)}
          className="h-4 w-4 rounded border-gray-700/50 bg-black/40"
          disabled={isLoading}
        />
        <label htmlFor="same-origin-only" className="select-none">
          Only include same-origin APIs
        </label>
      </div>
      
      {error && (
        <p className="text-red-400 text-sm font-medium tracking-tight4">{error}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 px-6 rounded-xl transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 tracking-tight4 font-bold text-black relative overflow-hidden bg-[linear-gradient(135deg,#F0FF26_0%,#E0EF16_100%)] hover:bg-[linear-gradient(135deg,#E0EF16_0%,#D0DF06_100%)]"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            <span>Discovering APIs...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span>Start Discovery</span>
          </div>
        )}
      </button>
    </form>
  )
} 